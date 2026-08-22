"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function getStudentDetails(studentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");
  
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    {
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );

  // Verify mentor has access to this student
  const { data: mentorProfile } = await adminClient.from('users').select('role').eq('id', user.id).single();
  if (!mentorProfile || mentorProfile.role !== 'mentor') throw new Error("Unauthorized");

  const { data: studentProfile } = await adminClient.from('users').select('full_name, pod_id').eq('id', studentId).single();
  if (!studentProfile || !studentProfile.pod_id) throw new Error("Student not found or has no pod");

  // Check if mentor manages this pod directly or via unit
  const { data: podMentors } = await adminClient.from("pod_mentors").select("pod_id").eq("mentor_id", user.id).eq("pod_id", studentProfile.pod_id);
  const isDirectMentor = podMentors && podMentors.length > 0;

  let isUnitMentor = false;
  if (!isDirectMentor) {
    const { data: pod } = await adminClient.from("pods").select("unit_id").eq("id", studentProfile.pod_id).single();
    if (pod?.unit_id) {
      const { data: unitMentors } = await adminClient.from("unit_mentors").select("unit_id").eq("mentor_id", user.id).eq("unit_id", pod.unit_id);
      if (unitMentors && unitMentors.length > 0) isUnitMentor = true;
    }
  }

  if (!isDirectMentor && !isUnitMentor) {
    throw new Error("Student not found or not in your managed pods");
  }

  // Fetch XP and submissions using admin client since Mentors don't have RLS read access to xp_transactions
  const [xpRes, submissionsRes, notesRes] = await Promise.all([
    adminClient.from('xp_transactions').select('amount').eq('user_id', studentId),
    adminClient.from('submissions')
      .select('id, date, status, reflection_text, reflection_ai_feedback, video_url, video_ai_feedback, word_cards(word)')
      .eq('user_id', studentId)
      .order('date', { ascending: false }),
    adminClient.from('mentor_notes').select('id, note, flagged').eq('mentor_id', user.id).eq('student_id', studentId).single()
  ]);

  const totalXp = xpRes.data ? xpRes.data.reduce((acc: number, curr: any) => acc + curr.amount, 0) : 0;
  const streak = submissionsRes.data ? submissionsRes.data.length : 0; // Simple streak for MVP
  
  // Prefer submissions with actual videos/reflections over dummy ones if dates match
  const sortedSubmissions = submissionsRes.data ? submissionsRes.data.sort((a, b) => {
    if (a.date !== b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (a.video_url && !b.video_url) return -1;
    if (!a.video_url && b.video_url) return 1;
    return 0;
  }) : [];
  
  const latestSubmission = sortedSubmissions.length > 0 ? sortedSubmissions[0] : null;

  let signedVideoUrl = null;
  if (latestSubmission?.video_url) {
    if (latestSubmission.video_url.startsWith('http')) {
      signedVideoUrl = latestSubmission.video_url;
    } else {
      const { data: signedData, error: signedErr } = await supabase.storage.from('videos').createSignedUrl(latestSubmission.video_url, 3600);
      if (signedErr) console.error("Signed URL error:", signedErr);
      signedVideoUrl = signedData?.signedUrl || null;
    }
  }

  return {
    student: {
      id: studentId,
      name: studentProfile.full_name,
      totalXp,
      streak
    },
    latestSubmission: latestSubmission ? {
      word: (latestSubmission.word_cards as any)?.word || "Unknown",
      date: latestSubmission.date,
      reflectionText: latestSubmission.reflection_text,
      reflectionAIFeedback: latestSubmission.reflection_ai_feedback,
      videoUrl: signedVideoUrl,
      videoAIFeedback: latestSubmission.video_ai_feedback,
    } : null,
    note: notesRes.data
  };
}

export async function saveMentorNote(studentId: string, note: string, flagged: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.rpc("save_mentor_note", {
    p_student_id: studentId,
    p_note: note,
    p_flagged: flagged
  });

  if (error) {
    console.error("Error saving mentor note:", error);
    throw new Error("Failed to save mentor note");
  }

  return { success: true };
}

export async function markSubmissionReviewed(submissionId: string, studentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // Use the secure RPC to ensure pod isolation
  const { error } = await supabase.rpc("mark_submission_reviewed", {
    p_submission_id: submissionId
  });

  if (error) {
    console.error("Mentor marking review failed:", error);
    throw new Error("Failed to mark submission as reviewed.");
  }

  // Revalidate mentor pages to clear the pending queue
  revalidatePath('/mentor/dashboard');
  revalidatePath(`/mentor/student/${studentId}`);
  
  return { success: true };
}
