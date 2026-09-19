"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { unstable_noStore as noStore } from "next/cache";

export async function submitPodChallenge(weeklyChallengeId: string, podId: string, videoUrl: string, description: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  // Check if pod has a designated leader
  const { data: pod } = await adminClient
    .from('pods')
    .select('id, name, admin_id')
    .eq('id', podId)
    .single();

  if (pod && pod.admin_id && pod.admin_id !== user.id) {
    let leaderName = "Pod Leader";
    const { data: leaderUser } = await adminClient.from('users').select('full_name').eq('id', pod.admin_id).maybeSingle();
    if (leaderUser?.full_name) leaderName = leaderUser.full_name;
    throw new Error(`Only your designated Pod Leader (${leaderName}) is authorized to submit the official weekly challenge video.`);
  }

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

  // Notify all members of the pod
  try {
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );
    const { data: podStudents } = await adminClient
      .from('users')
      .select('id')
      .eq('pod_id', podId);

    if (podStudents && podStudents.length > 0) {
      const notifRows = podStudents.map((s) => ({
        user_id: s.id,
        type: 'MASTER_EVALUATION_COMPLETED',
        title: '🏆 Master Mentor Evaluation Published!',
        message: `Your Pod received a score of ${score}/10 on the Weekly Championship presentation.`,
        action_url: '/championships',
        created_at: new Date().toISOString()
      }));
      await adminClient.from('notifications').insert(notifRows);
    }
  } catch (notifErr) {
    console.error("Non-blocking notification error:", notifErr);
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

  const { data: pod } = await adminClient
    .from('pods')
    .select('id, name, admin_id')
    .eq('id', profile.pod_id)
    .single();

  let leaderName = "Pod Leader";
  if (pod?.admin_id) {
    const { data: leaderUser } = await adminClient.from('users').select('full_name').eq('id', pod.admin_id).maybeSingle();
    if (leaderUser?.full_name) leaderName = leaderUser.full_name;
  }

  const { data: submission } = await adminClient
    .from('pod_challenge_submissions')
    .select('id, status, video_url, description, submitted_by, created_at')
    .eq('weekly_challenge_id', weeklyChallengeId)
    .eq('pod_id', profile.pod_id)
    .maybeSingle();

  const isLeader = pod?.admin_id ? pod.admin_id === user.id : true;

  return {
    podId: profile.pod_id,
    podName: pod?.name || "Your Pod",
    hasSubmitted: !!submission,
    status: submission?.status || null,
    isLeader,
    leaderName,
    leaderId: pod?.admin_id || null,
    submission: submission || null
  };
}

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
      admin_id,
      units ( name )
    `)
    .in("id", allPodIds);

  if (!pods) return [];

  // Fetch leader names
  const leaderIds = pods.map((p: any) => p.admin_id).filter(Boolean);
  let leaderMap = new Map<string, string>();
  if (leaderIds.length > 0) {
    const { data: leaders } = await adminClient.from('users').select('id, full_name').in('id', leaderIds);
    leaderMap = new Map(leaders?.map((l: any) => [l.id, l.full_name]) || []);
  }

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
    .select('id, pod_id, video_url, description, submitted_by, created_at')
    .eq('weekly_challenge_id', activeChallenge.id)
    .in('pod_id', allPodIds);

  const submissionsMap = new Map<string, any>(submissions?.map((s: any) => [s.pod_id, s]) || []);

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
      leader_name: (p.admin_id && leaderMap.get(p.admin_id)) || "Pod Leader",
      unit: p.units?.name || "No Unit",
      challenge_title: activeChallenge.title,
      video_url: sub ? sub.video_url : null,
      description: sub ? sub.description : null,
      status: status,
      championship_week_id: activeChallenge.championship_week_id
    };
  });
}
