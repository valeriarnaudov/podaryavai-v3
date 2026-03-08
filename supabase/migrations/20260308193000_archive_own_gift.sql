-- RPC to allow a user to archive their own gift idea (mark as bought)
CREATE OR REPLACE FUNCTION public.archive_own_gift(gift_id uuid, owner_id uuid)
RETURNS jsonb AS $$
DECLARE
    v_gift record;
BEGIN
    SELECT * INTO v_gift FROM public.gift_ideas WHERE id = gift_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Gift not found');
    END IF;

    IF v_gift.user_id != owner_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authorized');
    END IF;

    IF v_gift.is_bought THEN
        RETURN jsonb_build_object('success', true, 'awarded', 0, 'message', 'Gift is already bought');
    END IF;

    -- Update Gift
    UPDATE public.gift_ideas
    SET is_bought = true, buyer_id = owner_id
    WHERE id = gift_id;

    -- Award Karma to the owner for archiving (housekeeping)
    UPDATE public.users SET karma_points = COALESCE(karma_points, 0) + 5
    WHERE id = owner_id;

    RETURN jsonb_build_object('success', true, 'awarded', 5, 'message', 'Gift archived');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
