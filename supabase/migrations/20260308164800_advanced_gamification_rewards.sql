-- 1. Create a dynamic JSON setting for per-plan karma rewards
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES (
    'KARMA_REWARDS_CONFIG',
    '{
        "REFERRAL_CLICK":   { "FREE": 1,  "STANDARD": 2,  "PRO": 3,  "ULTRA": 4,  "BUSINESS": 5 },
        "REFERRAL_REGISTER": { "FREE": 25, "STANDARD": 35, "PRO": 50, "ULTRA": 65, "BUSINESS": 80 },
        "DAILY_LOGIN_DAY1":  { "FREE": 5,  "STANDARD": 10, "PRO": 15, "ULTRA": 20, "BUSINESS": 25 },
        "DAILY_LOGIN_DAY3":  { "FREE": 10, "STANDARD": 15, "PRO": 25, "ULTRA": 35, "BUSINESS": 50 },
        "DAILY_LOGIN_DAY7":  { "FREE": 25, "STANDARD": 35, "PRO": 50, "ULTRA": 75, "BUSINESS": 100 },
        "WISHLIST_ADD":      { "FREE": 5,  "STANDARD": 10, "PRO": 15, "ULTRA": 20, "BUSINESS": 25 },
        "GIFT_BOUGHT":       { "FREE": 25, "STANDARD": 35, "PRO": 50, "ULTRA": 75, "BUSINESS": 100 },
        "GIFT_BOUGHT_OWN":   { "FREE": 10, "STANDARD": 15, "PRO": 25, "ULTRA": 35, "BUSINESS": 50 }
    }'::text,
    'Configures the karma points rewarded for different actions, mapped by subscription plan.'
)
ON CONFLICT (setting_key) DO UPDATE 
SET setting_value = EXCLUDED.setting_value;

-- 2. Create the unified Karma helper function
CREATE OR REPLACE FUNCTION public.get_karma_reward(p_event_type text, p_user_id uuid)
RETURNS int AS $$
DECLARE
    v_config jsonb;
    v_plan text;
    v_reward int;
BEGIN
    -- Get user's plan
    SELECT subscription_plan INTO v_plan FROM public.users WHERE id = p_user_id;
    IF v_plan IS NULL THEN v_plan := 'FREE'; END IF;

    -- Get global config
    SELECT setting_value::jsonb INTO v_config 
    FROM public.platform_settings 
    WHERE setting_key = 'KARMA_REWARDS_CONFIG' 
    LIMIT 1;

    -- Extract reward
    BEGIN
        v_reward := (v_config->p_event_type->>v_plan)::int;
    EXCEPTION WHEN OTHERS THEN
        v_reward := 0;
    END;

    -- Fallback safety
    IF v_reward IS NULL THEN v_reward := 0; END IF;

    RETURN v_reward;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update the Referral Karma Trigger
CREATE OR REPLACE FUNCTION public.handle_referral_karma()
RETURNS TRIGGER AS $$
DECLARE
    v_referral_reward int := 50; -- Default fallback
BEGIN
    -- Check if the new user was invited by someone
    IF NEW.invited_by IS NOT NULL THEN
        
        -- A. Fetch the dynamic REWARD for REFERRAL_REGISTER based on the Inviter's Plan
        v_referral_reward := public.get_karma_reward('REFERRAL_REGISTER', NEW.invited_by);
        
        IF v_referral_reward = 0 THEN
            v_referral_reward := 50; -- absolute fallback
        END IF;

        -- 1. Award points to the Invitee (NEW user)
        NEW.karma_points := COALESCE(NEW.karma_points, 0) + v_referral_reward;

        -- 2. Award points to the Inviter
        UPDATE public.users 
        SET karma_points = COALESCE(karma_points, 0) + v_referral_reward
        WHERE id = NEW.invited_by;
        
        -- B. Automatically create a connection in the `contacts` table
        INSERT INTO public.contacts (user_id, contact_user_id, first_name, last_name, relationship)
        SELECT NEW.id, NEW.invited_by, COALESCE(u.first_name, 'Inviter'), COALESCE(u.last_name, ''), 'Friend'
        FROM public.users u WHERE u.id = NEW.invited_by
        ON CONFLICT DO NOTHING;
        
        -- Also connect the Invitee as a contact for the Inviter
        INSERT INTO public.contacts (user_id, contact_user_id, first_name, last_name, relationship)
        SELECT NEW.invited_by, NEW.id, COALESCE(NEW.first_name, 'Invitee'), COALESCE(NEW.last_name, ''), 'Friend'
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update the Daily Login Status
CREATE OR REPLACE FUNCTION public.get_daily_login_status(user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_user record;
    v_day1 int := 5;
    v_day3 int := 15;
    v_day7 int := 50;
    v_now timestamptz := now();
    v_can_claim boolean := false;
    v_next_streak int := 1;
    v_reward_amount int := 5;
BEGIN
    SELECT last_streak_claim_at, login_streak INTO v_user 
    FROM public.users WHERE id = user_id;
    
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false); END IF;

    -- Fetch Rewards per user's unique plan
    v_day1 := public.get_karma_reward('DAILY_LOGIN_DAY1', user_id);
    v_day3 := public.get_karma_reward('DAILY_LOGIN_DAY3', user_id);
    v_day7 := public.get_karma_reward('DAILY_LOGIN_DAY7', user_id);

    IF v_user.last_streak_claim_at IS NULL THEN
        v_can_claim := true;
        v_next_streak := 1;
        v_reward_amount := v_day1;
    ELSE
        IF date_trunc('day', v_now AT TIME ZONE 'UTC') = date_trunc('day', v_user.last_streak_claim_at AT TIME ZONE 'UTC') THEN
            v_can_claim := false;
            v_next_streak := v_user.login_streak;
            v_reward_amount := 0;
        ELSIF date_trunc('day', v_now AT TIME ZONE 'UTC') = date_trunc('day', (v_user.last_streak_claim_at + interval '1 day') AT TIME ZONE 'UTC') THEN
            v_can_claim := true;
            v_next_streak := COALESCE(v_user.login_streak, 0) + 1;
            IF v_next_streak % 7 = 0 THEN v_reward_amount := v_day7;
            ELSIF v_next_streak >= 3 THEN v_reward_amount := v_day3;
            ELSE v_reward_amount := v_day1; END IF;
        ELSE
            v_can_claim := true;
            v_next_streak := 1;
            v_reward_amount := v_day1;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 'can_claim', v_can_claim, 'current_streak', COALESCE(v_user.login_streak, 0),
        'next_streak', v_next_streak, 'reward_amount', v_reward_amount, 'day1_reward', v_day1, 'day3_reward', v_day3, 'day7_reward', v_day7
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update Wishlist Karma
CREATE OR REPLACE FUNCTION public.award_wishlist_karma(user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_count int;
BEGIN
    SELECT COUNT(*) INTO v_count 
    FROM public.gift_ideas 
    WHERE gift_ideas.user_id = $1 
      AND date_trunc('day', created_at AT TIME ZONE 'UTC') = date_trunc('day', now() AT TIME ZONE 'UTC')
      AND is_saved = true;

    IF v_count <= 3 THEN
        DECLARE
            v_reward int := public.get_karma_reward('WISHLIST_ADD', $1);
        BEGIN
            IF v_reward = 0 THEN v_reward := 5; END IF;
            UPDATE public.users SET karma_points = COALESCE(karma_points, 0) + v_reward WHERE id = $1;
            RETURN jsonb_build_object('success', true, 'awarded', v_reward, 'message', 'Wishlist karma awarded');
        END;
    ELSE
        RETURN jsonb_build_object('success', true, 'awarded', 0, 'message', 'Daily limit reached');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update Mark Gift As Bought Karma
CREATE OR REPLACE FUNCTION public.mark_gift_as_bought(gift_id uuid, buyer uuid)
RETURNS jsonb AS $$
DECLARE
    v_gift record;
BEGIN
    SELECT * INTO v_gift FROM public.gift_ideas WHERE id = gift_id;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'Gift not found'); END IF;
    IF v_gift.is_bought THEN RETURN jsonb_build_object('success', false, 'message', 'Gift is already bought'); END IF;
    IF v_gift.user_id = buyer THEN RETURN jsonb_build_object('success', false, 'message', 'Cannot buy your own gift'); END IF;

    UPDATE public.gift_ideas SET is_bought = true, buyer_id = buyer WHERE id = gift_id;

    DECLARE
        v_reward int := public.get_karma_reward('GIFT_BOUGHT', buyer);
    BEGIN
        IF v_reward = 0 THEN v_reward := 25; END IF;
        UPDATE public.users SET karma_points = COALESCE(karma_points, 0) + v_reward WHERE id = buyer;
        RETURN jsonb_build_object('success', true, 'awarded', v_reward, 'message', 'Gift marked as bought and karma awarded');
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
