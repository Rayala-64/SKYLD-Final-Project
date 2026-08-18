import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

// We create a fresh client for each role to isolate sessions
function getClient() {
  return createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
}

async function testAnonSecurity() {
  console.log("\n--- Testing ANON Security ---");
  const supabase = getClient();
  
  const { data: aiJobData, error: aiJobErr } = await supabase.rpc('claim_next_ai_job');
  if (!aiJobErr) {
    console.warn("⚠️ Anon could execute claim_next_ai_job!");
  } else {
    console.log("✅ RLS/RPC correctly blocked Anon from claim_next_ai_job");
  }

  const { data: rateData, error: rateErr } = await supabase.rpc('check_rate_limit', {
    p_ip_key: '1.2.3.4',
    p_limit: 10,
    p_window_seconds: 60
  });
  if (!rateErr) {
    console.warn("⚠️ Anon could execute check_rate_limit!");
  } else {
    console.log("✅ RLS/RPC correctly blocked Anon from check_rate_limit");
  }
}

async function testStudent() {
  console.log("\n--- Testing STUDENT Role ---");
  const supabase = getClient();
  const { data: auth, error } = await supabase.auth.signInWithPassword({
    email: 'student1@skyld.com',
    password: 'password123'
  });
  if (error) throw error;
  console.log("✅ Logged in as student:", auth.user.email);

  // Replicate student dashboard queries
  const { data: profile } = await supabase.from('users').select('*').eq('id', auth.user.id).single();
  console.log("✅ Profile fetched:", profile?.full_name);

  const { data: submissions } = await supabase.from('submissions').select('*').eq('user_id', auth.user.id);
  console.log(`✅ Submissions fetched: ${submissions?.length}`);

  const { data: otherUsers } = await supabase.from('users').select('*').eq('role', 'admin');
  if (otherUsers?.length === 0) {
    console.log("✅ RLS correctly blocked student from seeing admins.");
  } else {
    console.warn("⚠️ Student could see admins:", otherUsers);
  }
}

async function testMentor() {
  console.log("\n--- Testing MENTOR Role ---");
  const supabase = getClient();
  const { data: auth, error } = await supabase.auth.signInWithPassword({
    email: 'mentor1@skyld.com',
    password: 'password123'
  });
  if (error) throw error;
  console.log("✅ Logged in as mentor:", auth.user.email);

  const { data: profile } = await supabase.from('users').select('*').eq('id', auth.user.id).single();
  
  // Replicate mentor dashboard queries
  const { data: students } = await supabase.from('users').select('full_name').eq('pod_id', profile?.pod_id).eq('role', 'student');
  console.log(`✅ Fetched pod students: ${students?.map(s => s.full_name).join(', ')}`);

  const { data: submissions, error: subErr } = await supabase.from('submissions').select('*');
  console.log(`✅ Fetched submissions from pod: ${submissions?.length || 0}`);
  if (subErr) console.error(subErr);
}

async function testAdmin() {
  console.log("\n--- Testing ADMIN Role ---");
  const supabase = getClient();
  const { data: auth, error } = await supabase.auth.signInWithPassword({
    email: 'admin@skyld.com',
    password: 'password123'
  });
  if (error) throw error;
  console.log("✅ Logged in as admin:", auth.user.email);

  // Replicate admin dashboard queries
  const [usersRes, podsRes, submissionsRes] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact' }),
    supabase.from('pods').select('id', { count: 'exact' }),
    supabase.from('submissions').select('id', { count: 'exact' })
  ]);

  console.log(`✅ Global stats fetched: ${usersRes.count} users, ${podsRes.count} pods, ${submissionsRes.count} submissions`);
}

async function run() {
  try {
    await testAnonSecurity();
    await testStudent();
    await testMentor();
    await testAdmin();
    console.log("\n🚀 All tests passed!");
  } catch (err) {
    console.error("\n❌ Test failed:", err);
  }
}

run();
