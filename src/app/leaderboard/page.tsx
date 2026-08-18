import { getGlobalLeaderboard } from "@/app/actions/xp";
import { LeaderboardClient } from "./LeaderboardClient";
import { createClient } from "@/utils/supabase/server";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const leaderboardData = await getGlobalLeaderboard();

  // Mark the current user
  if (user) {
    for (let i = 0; i < leaderboardData.length; i++) {
      if (leaderboardData[i].id === user.id) {
        leaderboardData[i].isMe = true;
      }
    }
  }

  return <LeaderboardClient users={leaderboardData} />;
}
