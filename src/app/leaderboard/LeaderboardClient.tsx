"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FadeIn } from "@/components/animations/FadeIn";
import { StaggerContainer, StaggerItem } from "@/components/animations/Stagger";
import { Crown, Trophy, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

export type LeaderboardUser = { rank: number, name: string, xp: number, avatar: string, level: number, isMe?: boolean };

export function LeaderboardClient({ users }: { users: LeaderboardUser[] }) {
  const topThree = users.slice(0, 3);
  const remaining = users.slice(3);

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-heading font-bold flex items-center justify-center gap-3">
            <Trophy className="w-10 h-10 text-yellow-500" /> Leaderboard
          </h1>
          <p className="text-muted-foreground text-lg">See how you stack up against the competition this week.</p>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-muted-foreground">No students yet!</h2>
            <p className="text-muted-foreground">The leaderboard will update once students start earning XP.</p>
          </div>
        ) : (
          <>
            {/* Podium */}
            <div className="flex justify-center items-end h-64 gap-2 md:gap-6 mt-12 mb-16">
          {/* Silver - 2nd */}
          <PodiumItem user={topThree[1]} height={140} color="bg-gray-300 dark:bg-gray-700" delay={0.2} icon={<Trophy className="w-6 h-6 text-gray-500 dark:text-gray-400" />} />
          
          {/* Gold - 1st */}
          <PodiumItem user={topThree[0]} height={180} color="bg-yellow-400 dark:bg-yellow-600" delay={0.1} icon={<Crown className="w-8 h-8 text-yellow-600 dark:text-yellow-300" />} />
          
          {/* Bronze - 3rd */}
          <PodiumItem user={topThree[2]} height={110} color="bg-amber-600 dark:bg-amber-800" delay={0.3} icon={<Trophy className="w-5 h-5 text-amber-800 dark:text-amber-500" />} />
        </div>

        {/* Remaining List */}
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-0">
            <StaggerContainer className="flex flex-col">
              {remaining.map((user, idx) => (
                <StaggerItem key={user.rank}>
                  <div className={`flex items-center p-4 border-b border-border/40 last:border-0 hover:bg-muted/50 transition-colors ${user.isMe ? 'bg-primary/10' : ''}`}>
                    <div className="w-12 text-center font-bold text-muted-foreground text-lg">
                      {user.rank}
                    </div>
                    <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="ml-4 flex-1">
                      <h4 className={`font-semibold text-lg ${user.isMe ? 'text-primary' : 'text-foreground'}`}>{user.name}</h4>
                      <p className="text-sm text-muted-foreground">Level {user.level}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold font-heading text-lg">{user.xp} XP</div>
                      <div className="text-xs text-success flex items-center justify-end gap-1">
                        <TrendingUp className="w-3 h-3" /> +150 today
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </CardContent>
        </Card>
        </>
        )}
      </div>
    </DashboardLayout>
  );
}

function PodiumItem({ user, height, color, delay, icon }: { user: any, height: number, color: string, delay: number, icon: React.ReactNode }) {
  if (!user) return null;
  
  return (
    <motion.div 
      className="flex flex-col items-center w-24 md:w-32 relative"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
    >
      <div className="absolute -top-16 md:-top-20 flex flex-col items-center">
        <div className="mb-2">
          {icon}
        </div>
        <Avatar className={`w-14 h-14 md:w-16 md:h-16 border-4 shadow-xl ${user.isMe ? 'border-primary ring-2 ring-primary/50 ring-offset-2 ring-offset-background' : 'border-background'}`}>
          <AvatarImage src={user.avatar} />
          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
      </div>
      <div 
        className={`w-full rounded-t-xl ${color} shadow-lg relative flex flex-col items-center justify-start pt-4 overflow-hidden border border-white/10`}
        style={{ height }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
        <span className="font-bold text-black/60 dark:text-white/80 z-10 text-xl">{user.rank}</span>
        <span className="font-bold text-black/80 dark:text-white mt-1 z-10 text-sm whitespace-nowrap overflow-hidden text-ellipsis px-2 w-full text-center">{user.name}</span>
        <span className="text-xs font-semibold text-black/60 dark:text-white/60 z-10 mt-1">{user.xp} XP</span>
      </div>
    </motion.div>
  );
}
