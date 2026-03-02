-- Insert default Karma swipe settings if they don't exist
INSERT INTO platform_settings (setting_key, setting_value, description)
VALUES 
    ('KARMA_PER_SWIPE_FREE', '1', 'Karma points awarded per Giftinder swipe (right) for Free plan'),
    ('KARMA_PER_SWIPE_STANDARD', '2', 'Karma points awarded per Giftinder swipe (right) for Standard plan'),
    ('KARMA_PER_SWIPE_PRO', '3', 'Karma points awarded per Giftinder swipe (right) for Pro plan'),
    ('KARMA_PER_SWIPE_ULTRA', '4', 'Karma points awarded per Giftinder swipe (right) for Ultra plan'),
    ('KARMA_PER_SWIPE_BUSINESS', '5', 'Karma points awarded per Giftinder swipe (right) for Business plan')
ON CONFLICT (setting_key) DO NOTHING;

-- Create RPC to securely award Karma on Swipe and log it
CREATE OR REPLACE FUNCTION claim_swipe_karma(reward_amount DOUBLE PRECISION, gift_idea_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id uuid;
    v_new_balance double precision;
BEGIN
    -- Get caller ID
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 1. Check if this exact swipe was already rewarded (optional safety)
    -- But since we only reward on the very first "is_saved = true" transition in the frontend,
    -- and we don't want to overcomplicate the history with duplicate gift IDs, we'll just log it.
    
    -- 2. Update user's karma directly
    UPDATE users 
    SET karma_points = karma_points + reward_amount
    WHERE id = v_user_id
    RETURNING karma_points INTO v_new_balance;
    
    -- 3. Log the history so the user sees *why* they got points
    INSERT INTO user_karma_history(
        user_id, 
        amount, 
        transaction_type, 
        description
    ) VALUES (
        v_user_id, 
        reward_amount, 
        'EARNED', 
        'Giftinder Like Reward (Gift Idea)'
    );

    RETURN true;
END;
$$;
