import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing keys");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'student1@skyld.com',
    password: 'password123'
  });
  
  if (authError) {
    console.error("Login failed:", authError);
    return;
  }
  
  console.log("Logged in as:", authData.user.id);
  
  const { data: profile, error } = await supabase.from('users').select('*').eq('id', authData.user.id);
  console.log("Profile data with RLS:", profile);
  if (error) console.error("Error fetching profile:", error);
}

main().catch(console.error);
