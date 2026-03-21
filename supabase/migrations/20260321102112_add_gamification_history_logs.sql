-- Add historical records for Gamification (Referrals and Daily Streaks)

-- 1. Replace the reference to handle_referral_karma to also log history
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
        
        -- 3. [NEW] Log History for Inviter
        INSERT INTO public.user_karma_history(user_id, action_type, points, description)
        VALUES (NEW.invited_by, 'EARNED', v_referral_reward, 'Referral Bonus');

        -- 4. [NEW] Log History for Invitee
        -- Note: this can run in a BEFORE INSERT trigger because the FK usually references auth.users 
        -- or is deferred, given that contacts insertion below already relies on this assumption.
        INSERT INTO public.user_karma_history(user_id, action_type, points, description)
        VALUES (NEW.id, 'EARNED', v_referral_reward, 'Referral Bonus');

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

-- 2. Replace claim_daily_login to also log the 7-day streak to history
CREATE OR REPLACE FUNCTION public.claim_daily_login(user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_status jsonb;
    v_can_claim boolean;
    v_next_streak int;
    v_reward_amount int;
BEGIN
    -- Read state
    v_status := public.get_daily_login_status(user_id);
    v_can_claim := (v_status->>'can_claim')::boolean;
    v_next_streak := (v_status->>'next_streak')::int;
    v_reward_amount := (v_status->>'reward_amount')::int;

    IF NOT v_can_claim THEN
        RETURN jsonb_build_object('success', false, 'message', 'Already claimed today or ineligible.');
    END IF;

    -- Update User
    UPDATE public.users 
    SET 
        last_streak_claim_at = now(),
        login_streak = v_next_streak,
        karma_points = COALESCE(karma_points, 0) + v_reward_amount
    WHERE id = user_id;

    -- [NEW] Log History if it's a 7-day streak
    IF v_next_streak % 7 = 0 THEN
        INSERT INTO public.user_karma_history(user_id, action_type, points, description)
        VALUES (user_id, 'EARNED', v_reward_amount, '7-Day Streak Reward');
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'streak', v_next_streak, 
        'awarded', v_reward_amount, 
        'message', 'Daily streak claimed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
