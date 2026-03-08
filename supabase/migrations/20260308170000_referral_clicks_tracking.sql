-- 1. Create table to track clicks to prevent abuse
CREATE TABLE IF NOT EXISTS public.referral_clicks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    inviter_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    device_fingerprint text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Index for faster daily limits checking
CREATE INDEX IF NOT EXISTS idx_referral_clicks_daily 
ON public.referral_clicks(inviter_id, device_fingerprint, created_at);

-- 2. Create the RPC to record a click and award Karma
CREATE OR REPLACE FUNCTION public.record_referral_click(p_inviter_id uuid, p_fingerprint text)
RETURNS jsonb AS $$
DECLARE
    v_daily_clicks int;
    v_fingerprint_clicks int;
    v_reward int;
    MAX_DAILY_TOTAL int := 10; -- Max clicks an inviter can get points for per day
    MAX_FINGERPRINT_TOTAL int := 1; -- How many times the same device can click per day
BEGIN
    -- Validate user exists
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_inviter_id) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Inviter not found');
    END IF;

    -- Check if this specific device has clicked this inviter's link today
    SELECT COUNT(*) INTO v_fingerprint_clicks
    FROM public.referral_clicks
    WHERE inviter_id = p_inviter_id 
      AND device_fingerprint = p_fingerprint
      AND date_trunc('day', created_at AT TIME ZONE 'UTC') = date_trunc('day', now() AT TIME ZONE 'UTC');

    IF v_fingerprint_clicks >= MAX_FINGERPRINT_TOTAL THEN
        RETURN jsonb_build_object('success', true, 'awarded', 0, 'message', 'Device already clicked today');
    END IF;

    -- Check if the inviter has hit their absolute max clicks for the day (e.g. 10 unique clicks)
    SELECT COUNT(*) INTO v_daily_clicks
    FROM public.referral_clicks
    WHERE inviter_id = p_inviter_id 
      AND date_trunc('day', created_at AT TIME ZONE 'UTC') = date_trunc('day', now() AT TIME ZONE 'UTC');

    IF v_daily_clicks >= MAX_DAILY_TOTAL THEN
        -- Still record it, but give 0 points
        INSERT INTO public.referral_clicks (inviter_id, device_fingerprint) VALUES (p_inviter_id, p_fingerprint);
        RETURN jsonb_build_object('success', true, 'awarded', 0, 'message', 'Inviter reached max daily click reward limit');
    END IF;

    -- Look up the reward from the Config Engine
    v_reward := public.get_karma_reward('REFERRAL_CLICK', p_inviter_id);
    IF v_reward = 0 THEN v_reward := 1; END IF;

    -- Record the click
    INSERT INTO public.referral_clicks (inviter_id, device_fingerprint) VALUES (p_inviter_id, p_fingerprint);

    -- Award points
    UPDATE public.users SET karma_points = COALESCE(karma_points, 0) + v_reward
    WHERE id = p_inviter_id;

    RETURN jsonb_build_object('success', true, 'awarded', v_reward, 'message', 'Click recorded and Karma awarded');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
