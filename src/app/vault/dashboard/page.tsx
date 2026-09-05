import { getStudentDashboardData } from "@/app/actions/student";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { StaggerContainer, StaggerItem } from "@/components/animations/Stagger";
import { ProgressRing } from "@/components/ui/custom/ProgressRing";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Flame, 
  Zap, 
  BookOpen, 
  ArrowRight, 
  Trophy, 
  Crown, 
  Users, 
  Target, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  SendHorizontal,
  Volume2
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { ChampionshipLeaderboardRealtime } from "@/components/championships/LeaderboardRealtime";
import { NudgeBuddyButton } from "@/components/pod/NudgeBuddyButton";
import { CountdownWidget } from "@/components/ui/custom/CountdownWidget";

export default async function StudentDashboard() {
  const data = await getStudentDashboardData();
  
  // Fetch championship standings
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: standing } = await supabase
    .from('championship_standings')
    .select('*')
    .eq('student_id', user?.id)
    .single();

  const isMissionDone = !!data.dailyWord?.isCompleted;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        
        {/* Enterprise Hero Greeting */}
        <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/40 border border-border/50 rounded-2xl p-5 md:p-6 backdrop-blur-xl shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground tracking-tight">
                Good Morning, {data.profile.full_name.split(' ')[0]}
              </h1>
              <span className="inline-block origin-bottom-right animate-wave text-2xl">👋</span>
            </div>
            <p className="text-sm text-muted-foreground">
              You're on a <strong className="text-warning font-semibold">{data.stats.current_streak}-day</strong> learning streak. Complete today's 10-step ritual to stay on track.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
            <PremiumButton size="default" className="rounded-xl font-medium shadow-md w-full sm:w-auto" asChild>
              <Link href="/vault/learn">
                {isMissionDone ? "Review Today's Word" : "Start Daily Mission"} 
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </PremiumButton>
          </div>
        </section>

        {/* Global / Pod Announcements */}
        {data.announcements.length > 0 && (
          <section className="space-y-3">
            {data.announcements.map((announcement) => (
              <div 
                key={announcement.id} 
                className={`p-4 rounded-2xl border ${
                  announcement.scope === 'global' 
                    ? 'bg-primary/10 border-primary/20 text-primary' 
                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'
                } flex items-start gap-3 shadow-xs`}
              >
                <div className="p-2 bg-background/60 rounded-xl shrink-0 mt-0.5">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-semibold text-sm">{announcement.title}</h4>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-background/60 border border-border/30">
                      {announcement.scope}
                    </span>
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed">{announcement.body}</p>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* 4-Card Compact Metric Ribbon */}
        <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          {/* Card 1: Streak */}
          <StaggerItem>
            <PremiumCard glass className="p-4 relative overflow-hidden group hover:border-warning/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Active Streak</span>
                <div className="p-1.5 rounded-lg bg-warning/10 text-warning">
                  <Flame className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl md:text-3xl font-bold font-heading">{data.stats.current_streak}</span>
                <span className="text-xs text-muted-foreground">days</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-warning" /> 7-day milestone ahead
              </p>
            </PremiumCard>
          </StaggerItem>

          {/* Card 2: Total XP */}
          <StaggerItem>
            <PremiumCard glass className="p-4 relative overflow-hidden group hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Total XP</span>
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl md:text-3xl font-bold font-heading">{data.stats.total_xp.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">pts</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <span className="text-primary font-semibold">+50 XP</span> potential today
              </p>
            </PremiumCard>
          </StaggerItem>

          {/* Card 3: Championship Rank */}
          <StaggerItem>
            <PremiumCard glass className="p-4 relative overflow-hidden group hover:border-purple-500/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Batch Rank</span>
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
                  <Trophy className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl md:text-3xl font-bold font-heading">
                  #{standing?.batch_rank || 1}
                </span>
                <span className="text-xs text-muted-foreground">in cohort</span>
              </div>
              <p className="text-[11px] text-purple-400 mt-1 truncate">
                {standing ? `${standing.total_score} Total Pts` : "Championship active"}
              </p>
            </PremiumCard>
          </StaggerItem>

          {/* Card 4: Daily Ritual Status */}
          <StaggerItem>
            <PremiumCard glass className="p-4 relative overflow-hidden group hover:border-emerald-500/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Daily Ritual</span>
                <div className={`p-1.5 rounded-lg ${isMissionDone ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {isMissionDone ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl md:text-3xl font-bold font-heading">
                  {isMissionDone ? "Complete" : "10 Steps"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                {isMissionDone ? (
                  <span className="text-emerald-500 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> All steps recorded
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Due before midnight
                  </span>
                )}
              </p>
            </PremiumCard>
          </StaggerItem>
        </StaggerContainer>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left / Center Column: Daily Mission & Action Hub (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Daily Mission Focus Card */}
            <PremiumCard glass gradientBorder className="p-0 overflow-hidden border-primary/30 shadow-lg">
              <div className="h-1.5 bg-gradient-to-r from-primary via-indigo-500 to-purple-500" />
              
              <div className="p-5 md:p-6 bg-gradient-to-b from-card/80 via-card/50 to-background/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-border/40">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-lg text-foreground flex items-center gap-2">
                        Daily Vocabulary Mission
                        <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-sans font-semibold">
                          10-Step Ritual
                        </span>
                      </h3>
                      <p className="text-xs text-muted-foreground">Personalized daily corporate fluency assignment</p>
                    </div>
                  </div>

                  {isMissionDone ? (
                    <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Completed (+50 XP)
                    </span>
                  ) : (
                    <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> In Progress
                    </span>
                  )}
                </div>

                {data.dailyWord ? (
                  <div className="py-6 px-2 text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 border border-border/50 text-xs font-medium text-muted-foreground">
                      <Sparkles className="w-3.5 h-3.5 text-primary" /> Today's Assigned Word
                    </div>

                    <h2 className="text-4xl md:text-5xl font-heading font-extrabold tracking-tight text-foreground bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text">
                      {data.dailyWord.word}
                    </h2>

                    <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
                      {data.dailyWord.meaning}
                    </p>

                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                      <PremiumButton size="lg" className="rounded-xl shadow-md font-semibold px-8" asChild>
                        <Link href="/vault/learn">
                          {isMissionDone ? "Review 10-Step Mission" : "Start 10-Step Ritual"}
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                      </PremiumButton>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <p>No mission assigned yet for today.</p>
                  </div>
                )}
              </div>
            </PremiumCard>

            {/* Action Hub: Live Active Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Widget 1: Live Countdown Widget */}
              <CountdownWidget />

              {/* Widget 2: Study Buddy Live Monitor */}
              <PremiumCard glass className="p-5 flex flex-col justify-between hover:border-indigo-500/40 transition-all group h-full">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                        <Flame className="w-5 h-5" />
                      </div>
                      <span className="font-heading font-semibold text-base">Study Buddy Monitor</span>
                    </div>
                    {data.buddy && (
                      <span className="text-xs bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded-md font-medium">
                        {data.buddy.streak}d Streak
                      </span>
                    )}
                  </div>

                  {data.buddy ? (
                    <div className="space-y-3 py-1">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/40">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 border border-border">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {data.buddy.full_name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-semibold text-foreground">{data.buddy.full_name}</span>
                        </div>
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-bold ${
                          data.buddy.completedToday ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {data.buddy.completedToday ? "Done Today" : "Pending"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {data.buddy.completedToday 
                          ? "Your buddy has completed their 10-step ritual today. Keep up the good work together! 🔥" 
                          : "Your buddy hasn't completed today's ritual yet. Send them a nudge to keep your shared streak alive!"}
                      </p>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        Pair with a buddy in your Pod for accountability and shared streaks.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-border/30 flex items-center justify-between text-xs">
                  {data.buddy ? (
                    <>
                      <NudgeBuddyButton buddyId={data.buddy.id} buddyName={data.buddy.full_name} />
                      <Link href={`/vault/dashboard/buddy/${data.buddy.id}`} className="text-indigo-500 font-medium hover:underline flex items-center gap-1">
                        Profile <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </>
                  ) : (
                    <PremiumButton size="sm" variant="ghost" className="text-indigo-500 hover:text-indigo-400 p-0 h-auto w-full justify-center" asChild>
                      <Link href="/vault/pod">
                        Find a Buddy <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </PremiumButton>
                  )}
                </div>
              </PremiumCard>
            </div>
          </div>

          {/* Right Column: Leaderboard & Badges (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Championship Standings Card */}
            <PremiumCard glass className="p-0 overflow-hidden shadow-md">
              <div className="p-4 border-b border-border/40 flex items-center justify-between bg-muted/20">
                <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500" /> Batch Standings
                </h3>
                <Link href="/leaderboard" className="text-xs font-semibold text-primary hover:underline">
                  View Full
                </Link>
              </div>
              <div className="p-1">
                <ChampionshipLeaderboardRealtime initialData={data.championshipLeaderboard} />
              </div>
            </PremiumCard>

            {/* Badges Showcase */}
            <PremiumCard glass className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-semibold text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" /> Badges Earned
                </h3>
                <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                  {data.badges.length}
                </span>
              </div>

              {data.badges.length === 0 ? (
                <div className="py-6 text-center">
                  <div className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center mx-auto mb-2 text-muted-foreground">
                    <Trophy className="w-4 h-4 opacity-40" />
                  </div>
                  <p className="text-xs text-muted-foreground">Complete 10-step rituals to unlock fluency badges!</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {data.badges.map((badge) => (
                    <div 
                      key={badge.id} 
                      className="flex flex-col items-center justify-center p-2 rounded-xl bg-muted/30 border border-border/40 text-center gap-1.5 group hover:border-amber-500/30 transition-all"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-amber-500 shadow-xs border border-amber-500/30">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-semibold leading-tight line-clamp-1 text-foreground">
                        {badge.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </PremiumCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
