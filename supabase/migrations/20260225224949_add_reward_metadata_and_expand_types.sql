-- Add a JSONB column to Store flexible reward parameters
ALTER TABLE karma_rewards ADD COLUMN IF NOT EXISTS reward_metadata JSONB DEFAULT '{}'::jsonb;

-- Migrate existing 'PLAN_UPGRADE' rewards to use metadata for consistency,
-- though not strictly needed if we keep reward_value for simple cases.
UPDATE karma_rewards 
SET reward_metadata = jsonb_build_object('plan_code', reward_value)
WHERE reward_type = 'PLAN_UPGRADE' AND reward_metadata = '{}'::jsonb;

-- We will now support these NEW reward_types:
-- 1. 'PLAN_UPGRADE' (already exists): uses `duration_days` and `reward_metadata->>'plan_code'`
-- 2. 'ADD_FREE_DELIVERIES': increments `users.free_deliveries_count` by `reward_metadata->>'amount'`
-- 3. 'KARMA_BOOST': sets `users.karma_boost_until` = NOW() + `duration_days`
-- 4. 'UNLOCK_GOLDEN_AURA': sets `users.has_golden_aura` = true for `duration_days` (stored as active reward)
-- 5. 'UNLOCK_VIP_GIFTINDER': sets `users.has_vip_giftinder` = true permanently
-- 6. 'CUSTOM_SERVICE': manual fulfillment by admin (just history log)

-- To handle these securely during redemption, we will create a dedicated RPC function "redeem_karma_reward".
-- This replaces the multi-step frontend redemption and ensures atomic database updates.

CREATE OR REPLACE FUNCTION public.redeem_karma_reward(p_user_id UUID, p_reward_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_reward RECORD;
    v_user_points INTEGER;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 1. Get Reward
    SELECT * INTO v_reward FROM public.karma_rewards WHERE id = p_reward_id;
    IF NOT FOUND OR NOT v_reward.is_active THEN
        RAISE EXCEPTION 'Reward not found or inactive.';
    END IF;

    -- 2. Check User Points
    SELECT karma_points INTO v_user_points FROM public.users WHERE id = p_user_id;
    IF v_user_points < v_reward.cost_points THEN
        RAISE EXCEPTION 'Insufficient Karma points.';
    END IF;

    -- 3. Deduct Points
    UPDATE public.users SET karma_points = karma_points - v_reward.cost_points WHERE id = p_user_id;

    -- 4. Apply Reward Logic
    IF v_reward.reward_type = 'PLAN_UPGRADE' THEN
        -- Add to active rewards
        v_expires_at := (NOW() + (v_reward.duration_days || ' days')::INTERVAL);
        INSERT INTO public.user_active_rewards (user_id, reward_id, expires_at)
        VALUES (p_user_id, p_reward_id, v_expires_at);

    ELSIF v_reward.reward_type = 'ADD_FREE_DELIVERIES' THEN
        -- Add free deliveries
        UPDATE public.users 
        SET free_deliveries_count = free_deliveries_count + COALESCE((v_reward.reward_metadata->>'amount')::INTEGER, 1)
        WHERE id = p_user_id;

    ELSIF v_reward.reward_type = 'KARMA_BOOST' THEN
        -- Set karma boost end date
        UPDATE public.users 
        SET karma_boost_until = (NOW() + (v_reward.duration_days || ' days')::INTERVAL)
        WHERE id = p_user_id;

    ELSIF v_reward.reward_type = 'UNLOCK_GOLDEN_AURA' THEN
        -- Add to active rewards to track duration
        v_expires_at := (NOW() + (v_reward.duration_days || ' days')::INTERVAL);
        INSERT INTO public.user_active_rewards (user_id, reward_id, expires_at)
        VALUES (p_user_id, p_reward_id, v_expires_at);
        -- Also set the fast boolean flag
        UPDATE public.users SET has_golden_aura = true WHERE id = p_user_id;

    ELSIF v_reward.reward_type = 'UNLOCK_VIP_GIFTINDER' THEN
        -- Permanent unlock
        UPDATE public.users SET has_vip_giftinder = true WHERE id = p_user_id;

    ELSIF v_reward.reward_type = 'CUSTOM_SERVICE' THEN
        -- Do nothing specific except log history
        NULL;

    ELSE
        RAISE EXCEPTION 'Unknown reward type.';
    END IF;

    -- 5. Log History
    INSERT INTO public.user_karma_history (user_id, action_type, points, description)
    VALUES (p_user_id, 'SPENT', v_reward.cost_points, 'Purchased reward: ' || v_reward.title);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
