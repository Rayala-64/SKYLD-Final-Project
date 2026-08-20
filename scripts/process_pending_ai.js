require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testWorker() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminClient = createClient(supabaseUrl, serviceKey);

  console.log("=== CALLING claim_next_ai_job ===");
  const { data: jobs, error: fetchError } = await adminClient.rpc('claim_next_ai_job');
  console.log("claim_next_ai_job result:", jobs, "error:", fetchError);

  console.log("\n=== ALL SUBMISSIONS IN DB ===");
  const { data: subs, error: subsErr } = await adminClient.from('submissions').select('*');
  console.log("Submissions:", subs);

  console.log("\n=== ALL AI_JOBS IN DB ===");
  const { data: allJobs, error: allJobsErr } = await adminClient.from('ai_jobs').select('*');
  console.log("AI Jobs:", allJobs);
}

testWorker();
