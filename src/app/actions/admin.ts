"use server";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import crypto from "crypto";

import type { AdminDashboardData } from "@/types/admin";

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Validate admin role
  let isAdmin = false;
  if (user) {
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (profile && profile.role === 'admin') {
          isAdmin = true;
      }
  }

  if (!isAdmin) {
    throw new Error("Unauthorized");
  }

  // Real data fetching logic with graceful error handling
  const safeQuery = async (query: any) => {
    try {
      const res = await query;
      if (res.error) {
        console.error("Supabase query error:", res.error);
        return { data: null, count: 0, error: res.error };
      }
      return res;
    } catch (e) {
      console.error("Supabase query exception:", e);
      return { data: null, count: 0, error: e };
    }
  };

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  const [studentsRes, podsRes, wordsRes, invitesRes, submissionsRes, upcomingRes, usersRecentRes, allUsersRes, submissionsTodayRes, pendingAiRes, failedAiRes, reviewsRes] = await Promise.all([
    safeQuery(adminClient.from("users").select("id", { count: "exact", head: true }).eq("role", "student")),
    safeQuery(adminClient.from("pods").select("id, name", { count: "exact" })),
    safeQuery(adminClient.from("submissions").select("id", { count: "exact", head: true }).eq("status", "submitted")),
    safeQuery(adminClient.from("invites").select("id", { count: "exact", head: true }).is("used_by", null)),
    safeQuery(adminClient.from("submissions")
      .select(`
        id, 
        reflection_ai_feedback, 
        date,
        user_id,
        word_card_id,
        users!submissions_user_id_fkey ( full_name ),
        word_cards!submissions_word_card_id_fkey ( word )
      `)
      .eq("status", "submitted")
      .order("date", { ascending: false })
      .limit(5)),
    safeQuery(adminClient.from("word_cards").select("id, word, active_date, definition, example_sentence").gte("active_date", new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })).order("active_date", { ascending: true }).limit(5)),
    safeQuery(adminClient.from("users").select("id, full_name, created_at").order("created_at", { ascending: false }).limit(5)),
    safeQuery(adminClient.from("users").select("id, full_name, email, role, created_at").order("created_at", { ascending: false }).limit(100)),
    safeQuery(adminClient.from("submissions").select("id", { count: "exact", head: true }).gte("date", new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }))),
    safeQuery(adminClient.from("ai_jobs").select("id", { count: "exact", head: true }).eq("status", "pending")),
    safeQuery(adminClient.from("ai_jobs").select("id", { count: "exact", head: true }).eq("status", "failed")),
    safeQuery(adminClient.from("ritual_reviews").select(`
      id,
      review_type,
      status,
      created_at,
      reviewer:users!ritual_reviews_reviewer_id_fkey(full_name, email),
      reviewee:users!ritual_reviews_reviewee_id_fkey(full_name, email, pod_id),
      ritual:daily_rituals(id, status, word_card:word_cards(word))
    `).order("created_at", { ascending: false }).limit(50))
  ]);

  const recentReflections = (submissionsRes.data || []).map((sub: any) => ({
    id: sub.id,
    student_name: sub.users?.full_name || "Unknown",
    word: sub.word_cards?.word || "Unknown",
    ai_quality: (sub.reflection_ai_feedback as any)?.score || 0,
    created_at: sub.date
  }));

  const upcomingWords = (upcomingRes.data || []).map((w: any) => ({
    id: w.id,
    date: new Date(w.active_date).toLocaleDateString(),
    word: w.word,
    definition: w.definition,
    example: w.example_sentence,
    rawDate: w.active_date // raw for form input
  }));
  
  const recentActivity = (usersRecentRes.data || []).map((u: any) => ({
    id: u.id,
    title: "New student joined",
    description: `${u.full_name} signed up to the platform`,
    time: new Date(u.created_at).toLocaleString()
  }));

  const allUsers = (allUsersRes.data || []).map((u: any) => ({
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    role: u.role,
    created_at: new Date(u.created_at).toLocaleDateString()
  }));

  const pods = (podsRes.data || []).map((p: any) => ({
    id: p.id,
    name: p.name || 'Unnamed Pod'
  }));

  const podsMap = new Map<string, string>();
  pods.forEach((p: { id: string; name: string }) => podsMap.set(p.id, p.name));

  // Build Live Review Queue Tracker
  const trackerMap = new Map<string, any>();
  for (const r of (reviewsRes.data || [])) {
    const key = r.ritual?.id || `${r.reviewee?.email}_${r.created_at}`;
    if (!trackerMap.has(key)) {
      trackerMap.set(key, {
        ritualId: r.ritual?.id || r.id,
        studentName: r.reviewee?.full_name || "Unknown",
        studentEmail: r.reviewee?.email || "",
        podName: podsMap.get(r.reviewee?.pod_id) || "Pod",
        word: r.ritual?.word_card?.word || "Daily Mission",
        buddyReviewer: null,
        peerReviewer: null,
        submittedAt: new Date(r.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      });
    }

    const item = trackerMap.get(key);
    if (r.review_type === 'BUDDY') {
      item.buddyReviewer = {
        name: r.reviewer?.full_name || "Buddy",
        email: r.reviewer?.email || "",
        status: r.status
      };
    } else if (r.review_type === 'PEER') {
      item.peerReviewer = {
        name: r.reviewer?.full_name || "Peer",
        email: r.reviewer?.email || "",
        status: r.status
      };
    }
  }

  const reviewTracker = Array.from(trackerMap.values());

  const totalStudents = studentsRes.count || 0;
  const submissionsToday = submissionsTodayRes.count || 0;
  const avgCompletionRate = totalStudents > 0 ? Math.round((submissionsToday / totalStudents) * 100) : 0;

  const quarantineStats = await getQuarantineAnalytics();

  return {
    platformStats: {
      totalStudents,
      activePods: podsRes.count || 0,
      wordsLearned: wordsRes.count || 0,
      avgCompletionRate,
      pendingInvites: invitesRes.count || 0,
      pendingAiJobs: pendingAiRes.count || 0,
      failedAiJobs: failedAiRes.count || 0
    },
    recentReflections,
    upcomingWords,
    recentActivity,
    allUsers,
    pods,
    reviewTracker,
    quarantineStats
  };
}

import { generateActivitiesInternal } from "@/lib/server/ai";

export async function addWordCard(word: string, definition: string, example: string, date: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') throw new Error("Unauthorized");

  // Generate activities using Gemini
  const activity = await generateActivitiesInternal(word, definition, example);

  const { error } = await supabase.from('word_cards').insert({
    word,
    definition,
    example_sentence: example,
    active_date: date,
    activity
  });

  if (error) {
    console.error("Failed to insert word card:", error);
    throw new Error("Unable to add word card.");
  }
  
  return { success: true };
}

export async function deleteWordCard(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') throw new Error("Unauthorized");

  const { error } = await supabase.from('word_cards').delete().eq('id', id);
  if (error) {
    console.error("Failed to delete word card:", error);
    throw new Error("Unable to delete word card.");
  }
  return { success: true };
}

export async function generateInviteCode(role: string, pod_id: string | null = null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') throw new Error("Unauthorized");

  // Generate a cryptographically secure 10-character code
  const code = "SKYLD-" + crypto.randomBytes(5).toString('hex').toUpperCase();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabaseAdmin.from('invites').insert({
    code,
    role,
    pod_id,
    created_by: user.id,
    expires_at: expiresAt.toISOString()
  });

  if (error) {
    console.error("Failed to generate invite code:", error);
    throw new Error("Unable to generate invite code.");
  }
  return { code };
}

export async function updateWordCard(id: string, word: string, definition: string, example: string, date: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') throw new Error("Unauthorized");

  const { error } = await supabase.from('word_cards').update({
    word,
    definition,
    example_sentence: example,
    active_date: date
  }).eq('id', id);
  
  if (error) {
    console.error("Failed to update word card:", error);
    throw new Error("Unable to update word card.");
  }
  return { success: true };
}

export async function createAnnouncement(title: string, body: string, scope: 'global' | 'pod', pod_id?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') throw new Error("Unauthorized");

  const { error } = await supabase.from('announcements').insert({
    title,
    body,
    scope,
    pod_id: scope === 'pod' ? pod_id : null,
    author_id: user.id
  });

  if (error) {
    console.error("Failed to create announcement:", error);
    throw new Error("Unable to create announcement.");
  }
  return { success: true };
}

import { generateWordContentInternal, GeneratedWordData } from "@/lib/server/ai";

export async function generateAIWordAction(word: string, wordType: string, fieldToRegenerate?: keyof GeneratedWordData, existingData?: Partial<GeneratedWordData>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') throw new Error("Unauthorized");

  const data = await generateWordContentInternal(word, wordType, fieldToRegenerate, existingData);
  if (!data) throw new Error("Failed to generate content");
  
  return { success: true, data };
}

import { getQuarantineAnalytics } from "@/lib/server/word_assignment";

export async function getQuarantineAnalyticsAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  return await getQuarantineAnalytics();
}
