"use client";

import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/utils/supabase/client";

interface LeaderboardEntry {
  student_id: string;
  student_name: string;
  total_score: number;
  batch_rank: number;
  is_current_user: boolean;
}

export function ChampionshipLeaderboardRealtime({
  initialData,
}: {
  initialData: LeaderboardEntry[];
}) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initialData);

  useEffect(() => {
    const supabase = createClient();
    
    // Subscribe to score events
    const channel = supabase
      .channel('score-events-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'championship_score_events'
        },
        async (payload) => {
          // A score event occurred. Since calculating standings requires complex views and 
          // aggregations, we trigger a simple fetch of the updated top 10 standings.
          // This keeps Realtime as a UX enhancement without bringing heavy logic to the client.
          const { data: topStudents } = await supabase.from("championship_standings")
            .select("student_id, student_name, total_score, batch_rank")
            .order("batch_rank", { ascending: true })
            .limit(10);
            
          if (topStudents) {
            const topIds = new Set(topStudents.map((s: any) => s.student_id));
            const newLeaderboard = topStudents.map((s: any) => ({
              ...s,
              is_current_user: s.student_id === initialData.find(u => u.is_current_user)?.student_id
            }));

            const currentUserEntry = leaderboard.find(u => u.is_current_user);
            if (currentUserEntry && !topIds.has(currentUserEntry.student_id)) {
                // Re-fetch current user if not in top 10
                const { data: currentUserStanding } = await supabase.from("championship_standings")
                  .select("student_id, student_name, total_score, batch_rank")
                  .eq("student_id", currentUserEntry.student_id)
                  .single();
                  
                if (currentUserStanding) {
                    newLeaderboard.push({
                        ...currentUserStanding,
                        is_current_user: true
                    });
                }
            }
            setLeaderboard(newLeaderboard);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  return (
    <div className="p-4 space-y-4">
      {leaderboard.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center">No active championship data.</p>
      ) : (
        <>
          {leaderboard.filter(u => u.batch_rank <= 10).map((user) => (
            <div key={user.student_id} className={`flex items-center justify-between p-3 rounded-xl transition-colors ${user.is_current_user ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-6 text-center font-bold ${user.batch_rank === 1 ? 'text-yellow-500' : user.batch_rank === 2 ? 'text-gray-400' : user.batch_rank === 3 ? 'text-amber-700' : 'text-muted-foreground'}`}>
                  {user.batch_rank}
                </div>
                <Avatar className="w-8 h-8 border border-border">
                  <AvatarFallback>{user.student_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className={`font-medium ${user.is_current_user ? 'text-primary font-bold' : ''}`}>
                    {user.student_name}
                    {user.is_current_user && <span className="ml-2 text-[10px] bg-primary/20 px-2 py-0.5 rounded-full uppercase tracking-wider">You</span>}
                </span>
              </div>
              <span className="text-sm font-semibold text-muted-foreground">{user.total_score} <span className="text-[10px]">PTS</span></span>
            </div>
          ))}

          {/* Current User if not in Top 10 */}
          {leaderboard.some(u => u.is_current_user && u.batch_rank > 10) && (
            <>
              <div className="border-t border-dashed border-border/50 my-2" />
              {leaderboard.filter(u => u.is_current_user && u.batch_rank > 10).map((user) => (
                <div key={user.student_id} className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-6 text-center font-bold text-muted-foreground">
                      {user.batch_rank}
                    </div>
                    <Avatar className="w-8 h-8 border border-border">
                      <AvatarFallback>{user.student_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-bold text-primary">
                        {user.student_name}
                        <span className="ml-2 text-[10px] bg-primary/20 px-2 py-0.5 rounded-full uppercase tracking-wider">You</span>
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-muted-foreground">{user.total_score} <span className="text-[10px]">PTS</span></span>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
