-- Create a function to find users who have a birthday today and have notifications enabled
CREATE OR REPLACE FUNCTION get_today_birthdays()
RETURNS TABLE (
  id uuid,
  email varchar,
  full_name text,
  dob text,
  target_days integer
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
    (au.raw_user_meta_data->>'dob')::text as dob,
    0 as target_days -- Hardcoded to 0 for "On the Day" template trigger
  FROM public.users u
  JOIN auth.users au ON u.id = au.id
  WHERE u.notify_email_events = true
    AND au.raw_user_meta_data->>'dob' IS NOT NULL
    AND au.raw_user_meta_data->>'dob' != ''
    AND (
      -- Check if MM-DD of the birthdate matches today's MM-DD
      -- Assumes dob format is YYYY-MM-DD
      substring(au.raw_user_meta_data->>'dob' from 6 for 5) = to_char(current_date, 'MM-DD')
    );
END;
$$;
