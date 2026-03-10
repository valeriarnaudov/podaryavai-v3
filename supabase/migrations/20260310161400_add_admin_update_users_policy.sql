-- Allow admins to update user records (for banning, making admin, changing karma, etc.)
DROP POLICY IF EXISTS "Admins can update users" ON users;
CREATE POLICY "Admins can update users" ON users FOR UPDATE USING (
    public.is_current_user_admin()
);
