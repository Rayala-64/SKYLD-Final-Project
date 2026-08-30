import { getStudentDashboardData } from "@/app/actions/student";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { StaggerContainer, StaggerItem } from "@/components/animations/Stagger";
import { ProgressRing } from "@/components/ui/custom/ProgressRing";
import { Flame, Zap, Trophy, BookOpen, Crown, Target, Users } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function BuddyDashboard({ params }: { params: Promise<{ buddyId: string }> }) {
  const resolvedParams = await params;
  const data = await getStudentDashboardData(resolvedParams.buddyId);
  
  // Fetch championship standings for buddy
  const supabase = await createClient();
  const { data: standing } = await supabase
    .from('championship_standings')
    .select('*')
    .eq('student_id', resolvedParams.buddyId)
    .single();

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-8">
        
        {/* Header */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground">
              Buddy Dashboard: {data.profile.full_name}
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Viewing progress for your study buddy. They are on a <strong className="text-warning">{data.stats.current_streak}-day</strong> learning streak.
            </p>
          </div>
          <Link href="/vault/dashboard" className="text-primary hover:underline font-semibold">
            &larr; Back to my dashboard
          </Link>
        </section>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <StaggerItem>
            <PremiumCard glass className="p-6 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Flame className="w-32 h-32 text-warning" />
              </div>
              <div className="flex items-center gap-3 mb-2 relative z-10">
                <div className="p-2 rounded-xl bg-warning/10 text-warning">
                  <Flame className="w-5 h-5" />
                </div>
                <span className="font-semibold text-muted-foreground">Streak</span>
              </div>
              <div className="text-4xl font-bold font-heading relative z-10">
                {data.stats.current_streak} <span className="text-xl text-muted-foreground font-sans font-normal">days</span>
              </div>
            </PremiumCard>
          </StaggerItem>

          <StaggerItem>
            <PremiumCard glass className="p-6 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Zap className="w-32 h-32 text-primary" />
              </div>
              <div className="flex items-center gap-3 mb-2 relative z-10">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Zap className="w-5 h-5" />
                </div>
                <span className="font-semibold text-muted-foreground">Total XP</span>
              </div>
              <div className="text-4xl font-bold font-heading relative z-10">
                {data.stats.total_xp.toLocaleString()}
              </div>
            </PremiumCard>
          </StaggerItem>

          <StaggerItem className="lg:col-span-2">
            <PremiumCard glass gradientBorder className="p-6 bg-gradient-to-br from-card/80 to-primary/5 flex flex-col sm:flex-row items-center justify-between gap-6 h-full">
              <div className="flex-1 space-y-4 w-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-foreground">Championship Score</span>
                  </div>
                  {standing ? (
                    <span className="text-sm font-medium text-muted-foreground">Rank #{standing.batch_rank} in Batch</span>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">No championship active</span>
                  )}
                </div>
                
                {standing && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-xs">
                        <div className="bg-background/50 p-2 rounded-lg text-center">
                            <span className="block text-muted-foreground mb-1">Ritual</span>
                            <span className="font-bold">{standing.daily_ritual_points} <span className="opacity-50 font-normal">/ 280</span></span>
                        </div>
                        <div className="bg-background/50 p-2 rounded-lg text-center">
                            <span className="block text-muted-foreground mb-1">Pod Ch.</span>
                            <span className="font-bold">{standing.pod_challenge_points} <span className="opacity-50 font-normal">/ 40</span></span>
                        </div>
                        <div className="bg-background/50 p-2 rounded-lg text-center">
                            <span className="block text-muted-foreground mb-1">Eval</span>
                            <span className="font-bold">{(Number(standing.peer_evaluation_points) + Number(standing.master_evaluation_points))} <span className="opacity-50 font-normal">/ 80</span></span>
                        </div>
                        <div className="bg-background/50 p-2 rounded-lg text-center">
                            <span className="block text-muted-foreground mb-1">Grand</span>
                            <span className="font-bold">{standing.grand_championship_points} <span className="opacity-50 font-normal">/ 150</span></span>
                        </div>
                    </div>
                )}
              </div>
              <div className="flex justify-end">
                {standing ? (
                  <ProgressRing progress={(standing.total_score / 550) * 100} size={80} strokeWidth={6} color="#8b5cf6">
                    <span className="font-bold text-lg font-heading">{standing.total_score}</span>
                  </ProgressRing>
                ) : (
                  <div className="w-[80px] h-[80px] flex items-center justify-center rounded-full border-4 border-dashed border-muted/20">
                    <span className="text-muted-foreground text-xs text-center px-2">Pending</span>
                  </div>
                )}
              </div>
            </PremiumCard>
          </StaggerItem>
        </StaggerContainer>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          {/* Main Action Area */}
          <div className="lg:col-span-2 space-y-6">
            <PremiumCard glass gradientBorder className="overflow-hidden border-primary/20">
              <div className="h-2 bg-gradient-to-r from-primary via-secondary to-accent" />
              <div className="p-6 border-b border-border/40 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-semibold flex items-center gap-2">
                    <BookOpen className="text-primary w-6 h-6" /> Daily Mission Status
                  </h3>
                </div>
                {data.dailyWord?.isCompleted ? (
                  <span className="bg-success/20 text-success text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Completed
                  </span>
                ) : (
                  <span className="bg-muted/50 text-muted-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Not Completed
                  </span>
                )}
              </div>
              <div className="p-8 text-center space-y-6 bg-gradient-to-b from-transparent to-muted/20">
                {data.dailyWord ? (
                  <>
                    <h2 className="text-6xl font-bold font-heading text-foreground tracking-tight">{data.dailyWord.word}</h2>
                    <p className="text-xl text-muted-foreground max-w-lg mx-auto">{data.dailyWord.meaning}</p>
                    <p className="pt-4 text-sm text-muted-foreground italic">You are viewing your buddy's progress.</p>
                  </>
                ) : (
                  <p className="text-lg text-muted-foreground">No mission scheduled for today.</p>
                )}
              </div>
              </PremiumCard>

              {/* Read-Only Statuses */}
              <div className="pt-4 space-y-4">
                <h3 className="text-xl font-bold font-heading flex items-center gap-2">
                  <Zap className="text-warning w-5 h-5" /> Daily Quests Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PremiumCard glass className={`p-5 border-l-4 flex items-center justify-between transition-all ${data.dailyWord?.isCompleted ? 'border-l-success bg-success/5' : 'border-l-muted-foreground/30 bg-muted/20'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${data.dailyWord?.isCompleted ? 'bg-success/20 text-success' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">Complete Mission</h4>
                      </div>
                    </div>
                    {data.dailyWord?.isCompleted ? <div className="text-success font-bold text-sm">DONE</div> : <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30" />}
                  </PremiumCard>
                  
                  <PremiumCard glass className={`p-5 border-l-4 flex items-center justify-between transition-all ${data.dailyWord?.isCompleted ? 'border-l-secondary bg-secondary/5' : 'border-l-muted-foreground/30 bg-muted/20'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-secondary/10 rounded-full ${data.dailyWord?.isCompleted ? 'text-secondary bg-secondary/20' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
                        <Flame className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">Maintain Streak</h4>
                      </div>
                    </div>
                    {data.dailyWord?.isCompleted ? <div className="text-success font-bold text-sm">DONE</div> : <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/30" />}
                  </PremiumCard>
                </div>
              </div>
            </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            <PremiumCard glass className="p-0 overflow-hidden">
              <div className="p-4 border-b border-border/40 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" /> Badges Earned
                </h3>
                <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md">
                  {data.badges.length}
                </span>
              </div>
              <div className="p-4">
                {data.badges.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No badges earned yet.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {data.badges.map((badge) => (
                      <div key={badge.id} className="flex flex-col items-center justify-center p-2 rounded-lg bg-muted/30 border border-border/50 text-center gap-2 group relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center text-yellow-500 shadow-sm border border-yellow-500/30">
                          <Trophy className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold leading-tight">{badge.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PremiumCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
