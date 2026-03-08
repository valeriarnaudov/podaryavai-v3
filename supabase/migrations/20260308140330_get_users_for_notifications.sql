-- Create a function to fetch all opted-in users and their relevant profile data
CREATE OR REPLACE FUNCTION get_users_for_notifications()
RETURNS TABLE (
  id uuid,
  email varchar,
  full_name text,
  first_name text,
  dob text,
  notify_email_events boolean
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email::varchar,
    (au.raw_user_meta_data->>'full_name')::text as full_name,
    COALESCE(
      (au.raw_user_meta_data->>'first_name')::text,
      SPLIT_PART((au.raw_user_meta_data->>'full_name')::text, ' ', 1)
    ) as first_name,
    (au.raw_user_meta_data->>'dob')::text as dob,
    u.notify_email_events
  FROM public.users u
  JOIN auth.users au ON u.id = au.id
  WHERE u.notify_email_events = true;
END;
$$;
