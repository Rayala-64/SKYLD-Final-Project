import { NextResponse, NextRequest } from 'next/server';
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { analyzeReflectionInternal, analyzeSpeechInternal } from '@/lib/server/ai';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  // 1. Fetch and atomically lock the next pending/failed job
  const { data: jobs, error: fetchError } = await adminClient
    .rpc('claim_next_ai_job');

  if (fetchError) {
    console.error("RPC fetchError:", fetchError);
    return NextResponse.json({ success: false, error: 'AI worker temporarily unavailable' }, { status: 500 });
  }

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ success: true, message: 'No pending jobs' });
  }

  const job = jobs[0];
  const submission = job; // the RPC returns fields flattened
  const word = job.word;
  
  if (!submission || !word) {
    await adminClient.from('ai_jobs').update({ status: 'failed', error_message: 'Missing submission data' }).eq('id', job.job_id);
    return NextResponse.json({ success: false, error: 'Invalid job data' });
  }

  try {
    // 3. Process AI
    const [reflectionRes, speechRes] = await Promise.all([
      analyzeReflectionInternal(submission.user_id, word, submission.reflection_text),
      submission.video_url ? analyzeSpeechInternal(submission.user_id, word, submission.video_url) : Promise.resolve({ status: 'completed', data: null, error: undefined })
    ]);

    if (reflectionRes.status === "error") {
      throw new Error(reflectionRes.error || "Reflection AI failed");
    }
    if (speechRes.status === "error") {
      throw new Error(speechRes.error || "Speech AI failed");
    }

    // 4. Update Submission
    const updateData: any = {};
    if (reflectionRes.data) {
      const fb: any = reflectionRes.data;
      fb.comment = fb.improvement_suggestions?.[0] || 'Great work!';
      updateData.reflection_ai_feedback = fb;
    }
    if (speechRes.data) {
      updateData.video_ai_feedback = speechRes.data;
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await adminClient.from('submissions').update(updateData).eq('id', job.submission_id);
      if (updateError) {
        throw updateError;
      }
    }

    // 5. Mark Job Complete
    const { error: jobUpdateError } = await adminClient.from('ai_jobs').update({ status: 'completed' }).eq('id', job.job_id);
    if (jobUpdateError) {
      throw jobUpdateError;
    }

    return NextResponse.json({ success: true, message: 'Processed job', job_id: job.job_id });
  } catch (error: any) {
    console.error("AI Cron Error:", error);
    
    // Exponential backoff logic
    const nextAttempts = (job.job_attempts || 1);
    let backoffSeconds = 30; // 30s
    if (nextAttempts === 2) backoffSeconds = 120; // 2m
    if (nextAttempts >= 3) backoffSeconds = 600; // 10m
    const nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();

    await adminClient.from('ai_jobs').update({ 
      status: 'failed',
      error_message: error.message,
      next_attempt_at: nextAttemptAt
    }).eq('id', job.job_id);

    return NextResponse.json({ success: false, error: "AI evaluation is temporarily unavailable" }, { status: 500 });
  }
}
