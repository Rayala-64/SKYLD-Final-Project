"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export interface PodDashboardData {
  pod: {
    id: string;
    name: string;
  } | null;
  mentor: {
    full_name: string;
    email: string;
  } | null;
  roster: Array<{
    id: string;
    full_name: string;
    level: number;
    xp: number;
  }>;
  messages: Array<{
    id: string;
    message: string;
    created_at: string;
    sender: {
      full_name: string;
      role: string;
    };
  }>;
  podScore: number;
}

export async function getPodDashboardData(cursor?: string): Promise<PodDashboardData> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Use service role client for data fetching to bypass RLS limitations
  // (e.g. users cannot read public.pods directly, mentors cannot read student xp_transactions)
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    {
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );

  // Get user's role and pod_id
  const { data: profile } = await adminClient.from("users").select("role, pod_id").eq("id", user.id).single();
  
  let targetPodId = profile?.pod_id;

  if (profile?.role === 'mentor' && !targetPodId) {
    const { data: podMentors } = await adminClient.from("pod_mentors").select("pod_id").eq("mentor_id", user.id);
    if (podMentors && podMentors.length > 0) {
      targetPodId = podMentors[0].pod_id;
    } else {
      const { data: unitMentors } = await adminClient.from("unit_mentors").select("unit_id").eq("mentor_id", user.id);
      if (unitMentors && unitMentors.length > 0) {
        const { data: unitPods } = await adminClient.from("pods").select("id").eq("unit_id", unitMentors[0].unit_id).limit(1);
        if (unitPods && unitPods.length > 0) targetPodId = unitPods[0].id;
      }
    }
  }
  
  if (!targetPodId) {
    return {
      pod: null,
      mentor: null,
      roster: [],
      messages: [],
      podScore: 0
    };
  }

  // Fetch pod details
  const podId = targetPodId;
  const { data: pod } = await adminClient.from("pods").select("id, name, admin_id, unit_id").eq("id", podId).single();

  // 2. Fetch Mentor
  let mentor = null;
  const { data: podMentors } = await adminClient.from("pod_mentors").select("mentor_id").eq("pod_id", podId).limit(1);
  let resolvedMentorId = podMentors?.[0]?.mentor_id;

  if (!resolvedMentorId && pod?.unit_id) {
    const { data: unitMentors } = await adminClient.from("unit_mentors").select("mentor_id").eq("unit_id", pod.unit_id).limit(1);
    resolvedMentorId = unitMentors?.[0]?.mentor_id;
  }

  if (resolvedMentorId) {
    const { data: mentorData } = await adminClient.from("users").select("full_name, email").eq("id", resolvedMentorId).single();
    if (mentorData) mentor = mentorData;
  }

  // 3. Fetch Roster
  const { data: rosterData } = await adminClient
    .rpc("get_pod_roster", { p_pod_id: podId });
    
  const roster = [];
  let podScore = 0;

  for (const student of (rosterData || [])) {
    const studentXp = student.total_xp || 0;
    podScore += studentXp;
    
    roster.push({
      id: student.id,
      full_name: student.full_name,
      level: student.level || 1,
      xp: studentXp
    });
  }

  // 4. Fetch Messages
  let query = adminClient
    .from("pod_messages")
    .select(`
      id,
      message,
      created_at,
      users ( full_name, role )
    `)
    .eq("pod_id", podId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data: messagesData } = await query;

  const messages = (messagesData || []).map((msg: any) => ({
    id: msg.id,
    message: msg.message,
    created_at: msg.created_at,
    sender: {
      full_name: msg.users?.full_name || "Unknown",
      role: msg.users?.role || "student"
    }
  }));

  return {
    pod: pod ? { id: pod.id, name: pod.name } : null,
    mentor,
    roster,
    messages,
    podScore
  };
}

export async function sendPodMessage(message: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("users").select("pod_id").eq("id", user.id).single();
  if (!profile || !profile.pod_id) throw new Error("No pod assigned");

  const { error } = await supabase.from("pod_messages").insert({
    pod_id: profile.pod_id,
    sender_id: user.id,
    message
  });

  if (error) {
    console.error("Failed to send pod message:", error);
    throw new Error("Unable to send message.");
  }
  
  return { success: true };
}

export async function setStudyBuddy(buddyId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");
  if (user.id === buddyId) throw new Error("Cannot select yourself as a buddy");

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    {
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );

  const { data: profile } = await adminClient.from("users").select("pod_id").eq("id", user.id).single();
  if (!profile || !profile.pod_id) throw new Error("No pod assigned");

  // Ensure user1_id < user2_id for constraint
  const user1 = user.id < buddyId ? user.id : buddyId;
  const user2 = user.id < buddyId ? buddyId : user.id;

  // Deactivate old pairs involving these users in this pod
  await adminClient.from("buddy_pairs")
    .update({ active: false, unassigned_at: new Date().toISOString() })
    .eq("pod_id", profile.pod_id)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id},user1_id.eq.${buddyId},user2_id.eq.${buddyId}`);

  // Create new active pair
  const { error } = await adminClient.from("buddy_pairs").insert({
    pod_id: profile.pod_id,
    user1_id: user1,
    user2_id: user2,
    active: true
  });

  if (error) {
    console.error("Set study buddy failed:", error);
    throw new Error("Failed to set study buddy.");
  }
  
  return { success: true };
}
