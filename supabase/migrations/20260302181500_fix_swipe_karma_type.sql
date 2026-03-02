-- Drop the BIGINT version
DROP FUNCTION IF EXISTS claim_swipe_karma(DOUBLE PRECISION, BIGINT);

-- Create the updated version taking UUID since gift_ideas.id is UUID
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

    -- Update user's karma directly
    UPDATE users 
    SET karma_points = COALESCE(karma_points, 0) + reward_amount
    WHERE id = v_user_id
    RETURNING karma_points INTO v_new_balance;
    
    -- Log the history so the user sees *why* they got points
    INSERT INTO user_karma_history(
        user_id, 
        amount, 
        transaction_type, 
        description
    ) VALUES (
        v_user_id, 
        reward_amount, 
        'EARNED', 
        'Giftinder Evaluation Reward'
    );

    RETURN true;
END;
$$;
