import { createClient } from '@supabase/supabase-js';

const url = 'https://iotweqixckcgdljjcoha.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvdHdlcWl4Y2tjZ2Rsampjb2hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMTE4MzksImV4cCI6MjA4Njg4NzgzOX0.By9hUkdn6fM5oUPCeQm7Qc9wh2yW5P9CPxSgvUASN2E';

const supabase = createClient(url, key);

async function check() {
    console.log("Logging in...");
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'valto.arnaudov@gmail.com',
        password: 'password123'
    });

    if (authErr) {
        console.error("Login failed:", authErr);
        return;
    }

    console.log("Logged in! Calling Edge Function...");
    const { data: funcData, error: funcErr } = await supabase.functions.invoke('generate_daily_gifts');
    console.log("Edge Function Response:", funcData);
    if (funcErr) console.error("Edge Function Error:", funcErr);

    console.log("Checking DB after function...");
    const { data: gifts, error: giftErr } = await supabase.from('gift_ideas').select('*').eq('user_id', authData.user.id).eq('is_saved', false);
    console.log("Unsaved Gifts in DB:", gifts?.length, gifts);
}

check();
