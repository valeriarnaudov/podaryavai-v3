-- Create a secure RPC function to fetch Karma Claims history with user details.
-- Since public.users does not store email/name, we must join with auth.users.
-- We use SECURITY DEFINER so that the function can read auth.users, but we 
-- explicitly check if the caller is an admin to prevent unauthorized access.

CREATE OR REPLACE FUNCTION public.get_karma_claims_history()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    action_type TEXT,
    points INTEGER,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    user_email VARCHAR,
    user_full_name TEXT
)
AS $$
BEGIN
    -- Only allow admins to execute this query
    IF NOT public.is_current_user_admin() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
    SELECT 
        h.id,
        h.user_id,
        h.action_type,
        h.points,
        h.description,
        h.created_at,
        u.email::VARCHAR,
        COALESCE(
            u.raw_user_meta_data->>'full_name', 
            (u.raw_user_meta_data->>'first_name') || ' ' || (u.raw_user_meta_data->>'last_name')
        )::TEXT as user_full_name
    FROM public.user_karma_history h
    JOIN auth.users u ON h.user_id = u.id
    WHERE h.action_type = 'SPENT'
    ORDER BY h.created_at DESC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
