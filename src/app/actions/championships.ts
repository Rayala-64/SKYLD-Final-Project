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

export async function getPodChallengeStatus(weeklyChallengeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // get user's pod
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    {
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );

  const { data: profile } = await adminClient.from('users').select('pod_id').eq('id', user.id).single();
  if (!profile || !profile.pod_id) return null;

  const { data: submission } = await adminClient
    .from('pod_challenge_submissions')
    .select('id, status')
    .eq('weekly_challenge_id', weeklyChallengeId)
    .eq('pod_id', profile.pod_id)
    .maybeSingle();

  return {
    podId: profile.pod_id,
    hasSubmitted: !!submission,
    status: submission?.status || null
  };
}

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { unstable_noStore as noStore } from "next/cache";

export async function getMentorEvaluationsData() {
  noStore();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    {
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );

  const { data: podMentors } = await adminClient.from("pod_mentors").select("pod_id").eq("mentor_id", user.id);
  const { data: unitMentors } = await adminClient.from("unit_mentors").select("unit_id").eq("mentor_id", user.id);

  const directPodIds = podMentors?.map((pm: any) => pm.pod_id) || [];
  const unitIds = unitMentors?.map((um: any) => um.unit_id) || [];
  
  let extraPodIds: string[] = [];
  if (unitIds.length > 0) {
    const { data: podsInUnits } = await adminClient.from("pods").select("id").in("unit_id", unitIds);
    extraPodIds = podsInUnits?.map((p: any) => p.id) || [];
  }

  const allPodIds = Array.from(new Set([...directPodIds, ...extraPodIds]));

  if (allPodIds.length === 0) return [];

  const { data: pods } = await adminClient
    .from("pods")
    .select(`
      id,
      name,
      units ( name )
    `)
    .in("id", allPodIds);

  if (!pods) return [];

  // Fetch active challenge
  const { data: activeChallenge } = await adminClient
    .from('weekly_challenges')
    .select('id, title, championship_week_id')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!activeChallenge) return []; // No active challenges to evaluate

  // Fetch submissions for this challenge from the mentor's pods
  const { data: submissions } = await adminClient
    .from('pod_challenge_submissions')
    .select('pod_id, video_url, description')
    .eq('weekly_challenge_id', activeChallenge.id)
    .in('pod_id', allPodIds);

  const submissionsMap = new Map(submissions?.map((s: any) => [s.pod_id, s]) || []);

  // Fetch master evaluations by this mentor for this week
  const { data: evaluations } = await adminClient
    .from('master_evaluations')
    .select('pod_id')
    .eq('championship_week_id', activeChallenge.championship_week_id)
    .eq('mentor_id', user.id);

  const evaluatedPodIds = new Set(evaluations?.map((e: any) => e.pod_id) || []);

  return pods.map((p: any) => {
    const sub = submissionsMap.get(p.id);
    const hasEvaluated = evaluatedPodIds.has(p.id);
    
    let status = "WAITING_FOR_SUBMISSION";
    if (sub && !hasEvaluated) status = "PENDING";
    if (hasEvaluated) status = "COMPLETED";

    return {
      id: p.id,
      name: p.name,
      unit: p.units?.name || "No Unit",
      challenge_title: activeChallenge.title,
      video_url: sub ? sub.video_url : null,
      description: sub ? sub.description : null,
      status: status,
      championship_week_id: activeChallenge.championship_week_id
    };
  });
}
