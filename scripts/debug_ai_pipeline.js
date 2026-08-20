const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function debug() {
  console.log("=== 1. CHECKING ENVIRONMENT ===");
  console.log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("CRON_SECRET:", process.env.CRON_SECRET);
  console.log("GEMINI_API_KEY present?", !!process.env.GEMINI_API_KEY, "Length:", process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0);

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log("\n=== 2. CHECKING SUBMISSIONS TABLE ===");
  const { data: submissions, error: subError } = await adminClient
    .from('submissions')
    .select('id, user_id, date, reflection_text, video_url, reflection_ai_feedback, video_ai_feedback, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (subError) {
    console.error("Error fetching submissions:", subError);
  } else {
    console.log(`Found ${submissions.length} recent submissions:`);
    submissions.forEach((s, idx) => {
      console.log(`\n[${idx + 1}] ID: ${s.id} | Date: ${s.date} | User: ${s.user_id}`);
      console.log(`    Status: ${s.status}`);
      console.log(`    Reflection Text: ${s.reflection_text?.substring(0, 40)}...`);
      console.log(`    Video URL: ${s.video_url}`);
      console.log(`    Reflection Feedback:`, JSON.stringify(s.reflection_ai_feedback));
      console.log(`    Video Feedback:`, JSON.stringify(s.video_ai_feedback));
    });
  }

  console.log("\n=== 3. CHECKING AI_JOBS TABLE ===");
  const { data: jobs, error: jobError } = await adminClient
    .from('ai_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (jobError) {
    console.error("Error fetching ai_jobs:", jobError);
  } else {
    console.log(`Found ${jobs.length} recent ai_jobs:`);
    jobs.forEach((j, idx) => {
      console.log(`\n[${idx + 1}] Job ID: ${j.id} | Submission ID: ${j.submission_id}`);
      console.log(`    Status: ${j.status} | Attempts: ${j.attempts}`);
      console.log(`    Error Message: ${j.error_message}`);
      console.log(`    Locked At: ${j.locked_at}`);
    });
  }

  console.log("\n=== 4. TESTING GEMINI API DIRECTLY ===");
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Respond with valid JSON: {\"test\": \"success\"}");
    console.log("Gemini API direct test output:", result.response.text());
  } catch (aiErr) {
    console.error("Gemini API Error:", aiErr);
  }
}

debug().catch(console.error);
