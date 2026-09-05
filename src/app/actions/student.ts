"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export interface StudentDashboardData {
  profile: {
    full_name: string;
    avatar_url: string | null;
  };
  stats: {
    total_xp: number;
    current_level: number;
    current_streak: number;
    communication_score: number | null;
  };
  dailyWord: {
    id: string;
    word: string;
    meaning: string;
    challenge_text: string | null;
    isCompleted: boolean;
  } | null;
  championshipLeaderboard: Array<{
    student_id: string;
    student_name: string;
    total_score: number;
    batch_rank: number;
    is_current_user: boolean;
  }>;
  buddy: {
    id: string;
    full_name: string;
    streak: number;
    completedToday: boolean;
  } | null;
  announcements: Array<{
    id: string;
    title: string;
    body: string;
    scope: string;
    created_at: string;
  }>;
  badges: Array<{
    id: string;
    name: string;
    icon: string;
    earned_at: string;
  }>;
}

import { assignDailyWordForStudent } from "@/lib/server/word_assignment";

export async function getStudentDashboardData(targetUserId?: string): Promise<StudentDashboardData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error("Unauthorized");
  }

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const fetchUserId = targetUserId || user.id;

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  const [profileRes, ritualRes, submissionsRes, streakRes] = await Promise.all([
    adminClient.from("users").select("full_name, level, pod_id, total_xp").eq("id", fetchUserId).single(),
    (async () => {
      if (fetchUserId !== user.id) {
        const { data: ritual } = await adminClient.from("daily_rituals").select("*").eq("student_id", fetchUserId).eq("ritual_date", todayStr).maybeSingle();
        if (ritual) {
           const { data: wc } = await adminClient.from("word_cards").select("*").eq("id", ritual.word_card_id).single();
           return { data: wc, isCompleted: ritual.status === 'COMPLETED' };
        }
        return { data: null, isCompleted: false };
      }
      try {
        const { wordCard, ritual } = await assignDailyWordForStudent(user.id, todayStr);
        return { data: wordCard, isCompleted: ritual?.status === 'COMPLETED' };
      } catch (e) {
        console.error("Dashboard word assignment fallback error:", e);
        return { data: null, isCompleted: false };
      }
    })(),
    adminClient.from("submissions").select("*").eq("user_id", fetchUserId),
    adminClient.from("streaks").select("current_streak").eq("user_id", fetchUserId).maybeSingle()
  ]);

  const profile = profileRes.data;

  // Fetch Championship Leaderboard
  // Top 10
  const { data: topStudents } = await adminClient.from("championship_standings")
    .select("student_id, student_name, total_score, batch_rank")
    .order("batch_rank", { ascending: true })
    .limit(10);
    
  // Current user / target user
  const { data: currentUserStanding } = await adminClient.from("championship_standings")
    .select("student_id, student_name, total_score, batch_rank")
    .eq("student_id", fetchUserId)
    .single();

  const submissions = submissionsRes.data || [];
  const total_xp = profile?.total_xp || 0;
  
  let communication_score: number | null = null;
  if (submissions.length > 0) {
    let validCount = 0;
    const totalScore = submissions.reduce((acc, sub) => {
      const textFb = sub.reflection_ai_feedback as any;
      const videoFb = sub.video_ai_feedback as any;
      
      let textScore = 0;
      let hasText = false;
      if (textFb && textFb.score !== undefined) {
        textScore = textFb.score * 10; // Out of 100
        hasText = true;
      }
      
      let videoScore = 0;
      let hasVideo = false;
      if (videoFb && videoFb.fluency !== undefined) {
        videoScore = videoFb.fluency;
        hasVideo = true;
      }

      if (hasText || hasVideo) {
        validCount++;
        // Formula: Reflection = 40%, Speech = 60%
        // If only one is available, weight it 100% for that submission
        let submissionScore = 0;
        if (hasText && hasVideo) {
          submissionScore = (textScore * 0.4) + (videoScore * 0.6);
        } else if (hasText) {
          submissionScore = textScore;
        } else if (hasVideo) {
          submissionScore = videoScore;
        }
        return acc + submissionScore;
      }
      return acc;
    }, 0);
    
    if (validCount > 0) {
      communication_score = Math.round(totalScore / validCount);
    }
  }

  const championshipLeaderboard = [];
  const topIds = new Set();
  
  if (topStudents) {
    topStudents.forEach((student: any) => {
      championshipLeaderboard.push({
        ...student,
        is_current_user: student.student_id === fetchUserId
      });
      topIds.add(student.student_id);
    });
  }
  
  if (currentUserStanding && !topIds.has(fetchUserId)) {
    championshipLeaderboard.push({
      ...currentUserStanding,
      is_current_user: true
    });
  }
  let isCompleted = false;
  const todaySubmission = submissions.find((s: any) => s.date === todayStr && s.status === 'submitted');
  if (todaySubmission) {
    isCompleted = true;
  }

  let buddy = null;
  const { data: buddyPair } = await adminClient
    .from("buddy_pairs")
    .select("user1_id, user2_id")
    .or(`user1_id.eq.${fetchUserId},user2_id.eq.${fetchUserId}`)
    .eq("active", true)
    .maybeSingle();

  if (buddyPair) {
    const buddyId = buddyPair.user1_id === fetchUserId ? buddyPair.user2_id : buddyPair.user1_id;
    const { data: buddyProfile } = await adminClient.from("users").select("full_name").eq("id", buddyId).single();
    if (buddyProfile) {
      // Check if buddy completed today's ritual
      const { data: buddyRitual } = await adminClient
        .from("daily_rituals")
        .select("status, total_points")
        .eq("student_id", buddyId)
        .eq("ritual_date", todayStr)
        .maybeSingle();

      const { data: buddyStreak } = await adminClient
        .from("streaks")
        .select("current_streak")
        .eq("user_id", buddyId)
        .maybeSingle();

      buddy = {
        id: buddyId,
        full_name: buddyProfile.full_name,
        streak: buddyStreak?.current_streak || 1,
        completedToday: buddyRitual?.total_points ? buddyRitual.total_points > 0 : false
      };
    }
  }

  // Fetch Announcements (Global + Pod)
  const { data: announcementsData } = await supabase
    .from("announcements")
    .select("id, title, body, scope, created_at")
    .or(`scope.eq.global,and(scope.eq.pod,pod_id.eq.${profile?.pod_id || '00000000-0000-0000-0000-000000000000'})`)
    .order("created_at", { ascending: false })
    .limit(3);

  // Fetch Badges
  const { data: badgesData } = await adminClient
    .from("user_badges")
    .select("id, earned_at, badges(id, name, icon_name)")
    .eq("user_id", fetchUserId)
    .order("earned_at", { ascending: false });

  const badges = (badgesData || []).map((b: any) => ({
    id: b.id,
    name: b.badges?.name || "Badge",
    icon: b.badges?.icon_name || "Award",
    earned_at: b.earned_at
  }));

  return {
    profile: { full_name: profileRes.data?.full_name || "Unknown", avatar_url: null },
    stats: { 
      total_xp, 
      current_level: profileRes.data?.level || Math.floor(total_xp / 1000) + 1, 
      current_streak: streakRes.data?.current_streak || 0, 
      communication_score 
    },
    dailyWord: ritualRes.data ? {
      id: ritualRes.data.id,
      word: ritualRes.data.word,
      meaning: ritualRes.data.meaning || ritualRes.data.definition || "",
      challenge_text: ritualRes.data.daily_life_example || ritualRes.data.business_example || ritualRes.data.example_sentence || null,
      isCompleted: ritualRes.isCompleted || isCompleted
    } : null,
    championshipLeaderboard,
    buddy,
    announcements: announcementsData || [],
    badges
  };
}

export async function evaluateBadges() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const userId = user.id;
  
  // 1. Get submission count for streak/consistency badges
  const { count } = await supabase
    .from("submissions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "submitted");

  if (!count) return;

  // Let's see if we should award the "First Step" badge (1 submission)
  if (count === 1) {
    await awardBadgeByName(userId, "First Step");
  }
  
  // 3-Day Streak
  const { data: streakData } = await supabase
    .from("streaks")
    .select("current_streak")
    .eq("user_id", userId)
    .single();

  if (streakData && streakData.current_streak >= 3) {
    await awardBadgeByName(userId, "3-Day Streak");
  }
}

async function awardBadgeByName(userId: string, badgeName: string) {
  const supabase = await createClient();
  
  // Find badge ID
  const { data: badge } = await supabase
    .from("badges")
    .select("id")
    .eq("name", badgeName)
    .single();

  if (!badge) return;

  // Check if they already have it
  const { data: existing } = await supabase
    .from("user_badges")
    .select("id")
    .eq("user_id", userId)
    .eq("badge_id", badge.id)
    .single();

  if (existing) return;

  // Award it
  await supabase.from("user_badges").insert({
    user_id: userId,
    badge_id: badge.id
  });
}


import { DailyMissionSchema } from "@/utils/validation";

export async function submitDailyMission(
  studentId: string,
  wordCardId: string,
  reflectionText: string,
  videoUrl: string | null,
  isQuizCorrect: boolean
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== studentId) {
    throw new Error("Unauthorized");
  }

  // Validate inputs
  const result = DailyMissionSchema.safeParse({
    studentId, wordCardId, reflectionText, videoUrl, isQuizCorrect
  });
  if (!result.success) {
    console.error("Invalid submission data", result.error);
    throw new Error("Invalid submission data. Please check your inputs.");
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const idempotencyKey = `daily_mission_${wordCardId}_${studentId}_${today}`;

  const { data: txData, error: txError } = await supabase.rpc("submit_daily_mission_tx", {
    p_student_id: studentId,
    p_word_card_id: wordCardId,
    p_date: today,
    p_reflection_text: reflectionText,
    p_reflection_ai_feedback: null,
    p_video_url: videoUrl,
    p_video_ai_feedback: null,
    p_is_quiz_correct: isQuizCorrect,
    p_idempotency_key: idempotencyKey
  });

  if (txError) {
    console.error("Mission transaction error:", txError);
    throw new Error("Failed to save submission");
  }
  
  // Instantly trigger the AI processor in the background to eliminate cron delay
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://skyld-word-vault.vercel.app';
  fetch(`${baseUrl}/api/cron/process-ai`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CRON_SECRET}`
    }
  }).catch(err => console.error("Instant cron trigger failed:", err));
  
  return txData;
}
