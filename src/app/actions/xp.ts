"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";

// Uses Admin Client to bypass RLS for inserting XP securely
function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

export async function getGlobalLeaderboard() {
  const adminClient = getAdminClient();
  const { data: users, error } = await adminClient
    .rpc("get_global_leaderboard", { p_limit: 50 });

  if (error || !users) {
    console.error("Global Leaderboard Error:", error);
    return [];
  }

  return users.map((u: any, idx: number) => ({
    id: u.id,
    rank: idx + 1,
    name: u.full_name,
    xp: u.total_xp || 0,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name)}&background=random`,
    level: u.level || 1,
    isMe: false
  }));
}
