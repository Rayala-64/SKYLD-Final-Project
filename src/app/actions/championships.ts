"use server";

import { createClient } from "@/utils/supabase/server";

export async function submitPodChallenge(weeklyChallengeId: string, podId: string, videoUrl: string, description: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from('pod_challenge_submissions')
    .insert({
      weekly_challenge_id: weeklyChallengeId,
      pod_id: podId,
      submitted_by: user.id,
      video_url: videoUrl,
      description: description,
      status: 'SUBMITTED'
    });

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      throw new Error("Your Pod has already submitted for this challenge.");
    }
    throw new Error(error.message);
  }

  return { success: true };
}

export async function evaluatePodChallenge(submissionId: string, score: number, feedback: string, evaluatorType: 'PEER_POD' | 'FACULTY' | 'ALUMNI' | 'INDUSTRY') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from('pod_challenge_evaluations')
    .insert({
      submission_id: submissionId,
      evaluator_id: user.id,
      evaluator_type: evaluatorType,
      score: score,
      feedback: feedback
    });

  if (error) throw new Error(error.message);

  return { success: true };
}

export async function submitMasterEvaluation(championshipWeekId: string, podId: string, score: number, feedback: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Mentor inserts their evaluation
  const { error } = await supabase
    .from('master_evaluations')
    .insert({
      championship_week_id: championshipWeekId,
      pod_id: podId,
      mentor_id: user.id,
      score: score,
      feedback: feedback,
      status: 'COMPLETED',
      completed_at: new Date().toISOString()
    });

  if (error) {
    if (error.code === '23505') throw new Error("You have already evaluated this Pod for this week.");
    throw new Error(error.message);
  }

  return { success: true };
}

export async function submitPeerEvaluationPhase3(peerEvaluationId: string, score: number, feedback: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Update peer evaluation
  const { data: evalData, error } = await supabase
    .from('peer_evaluations')
    .update({
      score: score,
      feedback: feedback,
      status: 'COMPLETED',
      completed_at: new Date().toISOString()
    })
    .eq('id', peerEvaluationId)
    .eq('reviewer_id', user.id) // Ensure security
    .select('championship_week_id, reviewee_id, score')
    .single();

  if (error) throw new Error(error.message);

  // We need to write the event to championship_score_events.
  // Because it runs server-side with user auth, we can just do a direct insert if RLS allows, 
  // or use a secure RPC if RLS blocks students from inserting score events directly.
  // Assuming we need a secure RPC for inserting score events to prevent students from faking scores.
  
  const { error: rpcError } = await supabase.rpc('award_peer_evaluation_points', {
    p_eval_id: peerEvaluationId,
    p_score: evalData.score
  });

  if (rpcError) {
      console.error(rpcError);
  }

  return { success: true };
}
