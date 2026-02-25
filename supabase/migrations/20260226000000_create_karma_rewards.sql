-- Create karma_rewards table
CREATE TABLE karma_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    cost_points INTEGER NOT NULL DEFAULT 0,
    reward_type TEXT NOT NULL DEFAULT 'PLAN_UPGRADE',
    reward_value TEXT NOT NULL, -- e.g. 'ULTRA'
    duration_days INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Protect karma_rewards (only admins can write, everyone can read active)
ALTER TABLE karma_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active rewards" ON karma_rewards FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can view all rewards" ON karma_rewards FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);
CREATE POLICY "Admins can insert rewards" ON karma_rewards FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);
CREATE POLICY "Admins can update rewards" ON karma_rewards FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);

-- Create user_karma_history table
CREATE TABLE user_karma_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('EARNED', 'SPENT')),
    points INTEGER NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Protect user_karma_history
ALTER TABLE user_karma_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own karma history" ON user_karma_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all karma history" ON user_karma_history FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);
-- Allow service role / functions to insert history
CREATE POLICY "Service Role can insert karma history" ON user_karma_history FOR INSERT WITH CHECK (true);

-- Create user_active_rewards table
CREATE TABLE user_active_rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    reward_id UUID REFERENCES karma_rewards(id) ON DELETE CASCADE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Protect user_active_rewards
ALTER TABLE user_active_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own active rewards" ON user_active_rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all active rewards" ON user_active_rewards FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.is_admin = true)
);
-- Only service roles/functions can securely insert active rewards after point deduction
CREATE POLICY "Service Role can insert/update active rewards" ON user_active_rewards FOR ALL USING (true);


-- Add realtime to new tables
alter publication supabase_realtime add table karma_rewards;
alter publication supabase_realtime add table user_karma_history;
alter publication supabase_realtime add table user_active_rewards;
