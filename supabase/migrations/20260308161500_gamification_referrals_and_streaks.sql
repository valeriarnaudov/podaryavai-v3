-- 1. Add new columns to public.users for Gamefication
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS last_streak_claim_at timestamptz,
ADD COLUMN IF NOT EXISTS login_streak integer DEFAULT 0;

-- 2. Create the Referral Karma trigger function
CREATE OR REPLACE FUNCTION public.handle_referral_karma()
RETURNS TRIGGER AS $$
DECLARE
    v_referral_reward int := 50; -- Default fallback
    v_setting_val text;
BEGIN
    -- Check if the new user was invited by someone
    IF NEW.invited_by IS NOT NULL THEN
        
        -- A. Fetch the dynamic reward points from Admin configs
        SELECT setting_value INTO v_setting_val 
        FROM public.platform_settings 
        WHERE setting_key = 'REFERRAL_REWARD_BASE' LIMIT 1;
        
        IF v_setting_val IS NOT NULL THEN
            v_referral_reward := v_setting_val::int;
        END IF;

        -- 1. Award points to the Invitee (NEW user)
        NEW.karma_points := COALESCE(NEW.karma_points, 0) + v_referral_reward;

        -- 2. Award points to the Inviter
        UPDATE public.users 
        SET karma_points = COALESCE(karma_points, 0) + v_referral_reward
        WHERE id = NEW.invited_by;
        
        -- B. Automatically create a connection in the `contacts` table
        -- This connects the Inviter as a contact for the Invitee
        INSERT INTO public.contacts (
            user_id, contact_user_id, first_name, last_name, relationship
        )
        SELECT 
            NEW.id, -- Owner is the Invitee
            NEW.invited_by, -- Contact ID is the Inviter
            COALESCE(u.first_name, 'Inviter'), 
            COALESCE(u.last_name, ''),
            'Friend'
        FROM public.users u
        WHERE u.id = NEW.invited_by
        ON CONFLICT DO NOTHING;
        
        -- Also connect the Invitee as a contact for the Inviter
        INSERT INTO public.contacts (
            user_id, contact_user_id, first_name, last_name, relationship
        )
        SELECT 
            NEW.invited_by, -- Owner is the Inviter
            NEW.id, -- Contact ID is the Invitee
            COALESCE(NEW.first_name, 'Invitee'), 
            COALESCE(NEW.last_name, ''),
            'Friend'
        ON CONFLICT DO NOTHING;

    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger to users table BEFORE INSERT so the NEW.karma_points is saved
DROP TRIGGER IF EXISTS on_user_referral ON public.users;
CREATE TRIGGER on_user_referral
    BEFORE INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_referral_karma();

-- 4. Create an RPC to check daily login streak state from the frontend (read-only)
CREATE OR REPLACE FUNCTION public.get_daily_login_status(user_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_user record;
    v_day1 int := 5;
    v_day3 int := 15;
    v_day7 int := 50;
    v_setting_val text;
    v_now timestamptz := now();
    v_can_claim boolean := false;
    v_next_streak int := 1;
    v_reward_amount int := 5;
BEGIN
    SELECT setting_value INTO v_setting_val FROM public.platform_settings WHERE setting_key = 'DAILY_LOGIN_DAY1' LIMIT 1;
    IF v_setting_val IS NOT NULL THEN v_day1 := v_setting_val::int; END IF;
    SELECT setting_value INTO v_setting_val FROM public.platform_settings WHERE setting_key = 'DAILY_LOGIN_DAY3' LIMIT 1;
    IF v_setting_val IS NOT NULL THEN v_day3 := v_setting_val::int; END IF;
    SELECT setting_value INTO v_setting_val FROM public.platform_settings WHERE setting_key = 'DAILY_LOGIN_DAY7' LIMIT 1;
    IF v_setting_val IS NOT NULL THEN v_day7 := v_setting_val::int; END IF;

    SELECT last_streak_claim_at, login_streak INTO v_user 
    FROM public.users WHERE id = user_id;
    
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false); END IF;

    IF v_user.last_streak_claim_at IS NULL THEN
        -- Never claimed
        v_can_claim := true;
        v_next_streak := 1;
        v_reward_amount := v_day1;
    ELSE
        IF date_trunc('day', v_now AT TIME ZONE 'UTC') = date_trunc('day', v_user.last_streak_claim_at AT TIME ZONE 'UTC') THEN
            -- Already claimed today
            v_can_claim := false;
            v_next_streak := v_user.login_streak;
            v_reward_amount := 0;
        ELSIF date_trunc('day', v_now AT TIME ZONE 'UTC') = date_trunc('day', (v_user.last_streak_claim_at + interval '1 day') AT TIME ZONE 'UTC') THEN
            -- Eligible for consecutive claim
            v_can_claim := true;
            v_next_streak := COALESCE(v_user.login_streak, 0) + 1;
            IF v_next_streak % 7 = 0 THEN v_reward_amount := v_day7;
            ELSIF v_next_streak >= 3 THEN v_reward_amount := v_day3;
            ELSE v_reward_amount := v_day1; END IF;
        ELSE
            -- Streak broken
            v_can_claim := true;
            v_next_streak := 1;
            v_reward_amount := v_day1;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'can_claim', v_can_claim,
        'current_streak', COALESCE(v_user.login_streak, 0),
        'next_streak', v_next_streak,
        'reward_amount', v_reward_amount,
        'day1_reward', v_day1,
        'day3_reward', v_day3,
        'day7_reward', v_day7
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create an RPC to actually claim the daily login streak points
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

    RETURN jsonb_build_object(
        'success', true, 
        'streak', v_next_streak, 
        'awarded', v_reward_amount, 
        'message', 'Daily streak claimed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC to connect two existing users as contacts (for the /invite route)
CREATE OR REPLACE FUNCTION public.connect_users(inviter_id uuid, invitee_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_inviter_exists boolean;
    v_invitee_exists boolean;
BEGIN
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = inviter_id) INTO v_inviter_exists;
    SELECT EXISTS(SELECT 1 FROM public.users WHERE id = invitee_id) INTO v_invitee_exists;
    
    IF NOT v_inviter_exists OR NOT v_invitee_exists THEN
        RETURN jsonb_build_object('success', false, 'message', 'User(s) not found');
    END IF;

    -- Insert Inviter into Invitee's contacts
    INSERT INTO public.contacts (user_id, contact_user_id, first_name, last_name, relationship)
    SELECT invitee_id, inviter_id, COALESCE(first_name, 'Inviter'), COALESCE(last_name, ''), 'Friend'
    FROM public.users WHERE id = inviter_id
    ON CONFLICT DO NOTHING;

    -- Insert Invitee into Inviter's contacts
    INSERT INTO public.contacts (user_id, contact_user_id, first_name, last_name, relationship)
    SELECT inviter_id, invitee_id, COALESCE(first_name, 'Invitee'), COALESCE(last_name, ''), 'Friend'
    FROM public.users WHERE id = invitee_id
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object('success', true, 'message', 'Users connected successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Add `is_bought` and `buyer_id` to `gift_ideas`
ALTER TABLE public.gift_ideas 
ADD COLUMN IF NOT EXISTS is_bought BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES public.users(id);

-- 8. RPC to award karma when adding a wishlist item (Max 3 per day)
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
        UPDATE public.users SET karma_points = COALESCE(karma_points, 0) + 5
        WHERE id = $1;
        RETURN jsonb_build_object('success', true, 'awarded', 5, 'message', 'Wishlist karma awarded');
    ELSE
        RETURN jsonb_build_object('success', true, 'awarded', 0, 'message', 'Daily limit reached');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RPC to mark a gift idea as bought and award karma to the buyer
CREATE OR REPLACE FUNCTION public.mark_gift_as_bought(gift_id uuid, buyer uuid)
RETURNS jsonb AS $$
DECLARE
    v_gift record;
BEGIN
    SELECT * INTO v_gift FROM public.gift_ideas WHERE id = gift_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Gift not found');
    END IF;

    IF v_gift.is_bought THEN
        RETURN jsonb_build_object('success', false, 'message', 'Gift is already bought');
    END IF;

    IF v_gift.user_id = buyer THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cannot buy your own gift');
    END IF;

    -- Update Gift
    UPDATE public.gift_ideas
    SET is_bought = true, buyer_id = buyer
    WHERE id = gift_id;

    -- Award Karma to the Buyer
    UPDATE public.users SET karma_points = COALESCE(karma_points, 0) + 25
    WHERE id = buyer;

    RETURN jsonb_build_object('success', true, 'awarded', 25, 'message', 'Gift marked as bought and karma awarded');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
