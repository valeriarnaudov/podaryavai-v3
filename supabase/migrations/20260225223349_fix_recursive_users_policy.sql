-- Drop recursive policy that caused 500 infinite recursion errors
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Create a SECURITY DEFINER function to check admin status bypassing RLS
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
  is_admin_flag BOOLEAN;
BEGIN
  SELECT is_admin INTO is_admin_flag
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN COALESCE(is_admin_flag, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the user SELECT policy safely using the helper function
CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (
    public.is_current_user_admin()
);

-- We also need to update the karma_rewards policies to use this non-recursive function
-- to prevent any tangential recursion when selecting rewards.

DROP POLICY IF EXISTS "Admins can view all rewards" ON karma_rewards;
CREATE POLICY "Admins can view all rewards" ON karma_rewards FOR SELECT USING (
    public.is_current_user_admin()
);

DROP POLICY IF EXISTS "Admins can insert rewards" ON karma_rewards;
CREATE POLICY "Admins can insert rewards" ON karma_rewards FOR INSERT WITH CHECK (
    public.is_current_user_admin()
);

DROP POLICY IF EXISTS "Admins can update rewards" ON karma_rewards;
CREATE POLICY "Admins can update rewards" ON karma_rewards FOR UPDATE USING (
    public.is_current_user_admin()
);

DROP POLICY IF EXISTS "Admins can delete rewards" ON karma_rewards;
CREATE POLICY "Admins can delete rewards" ON karma_rewards FOR DELETE USING (
    public.is_current_user_admin()
);

-- Protect user_karma_history safely
DROP POLICY IF EXISTS "Admins can view all karma history" ON user_karma_history;
CREATE POLICY "Admins can view all karma history" ON user_karma_history FOR SELECT USING (
    public.is_current_user_admin()
);

-- Protect user_active_rewards safely
DROP POLICY IF EXISTS "Admins can view all active rewards" ON user_active_rewards;
CREATE POLICY "Admins can view all active rewards" ON user_active_rewards FOR SELECT USING (
    public.is_current_user_admin()
);
