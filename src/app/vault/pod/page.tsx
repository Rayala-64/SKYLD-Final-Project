import { getPodDashboardData } from "@/app/actions/pod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { Users, Crown, MessageSquare, Target } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PodMessageForm } from "./PodMessageForm";
import { PodMessageList } from "@/components/pod/PodMessageList";
import { SelectBuddyButton } from "@/components/pod/SelectBuddyButton";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export default async function PodPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id;

  const data = await getPodDashboardData();

  if (!data.pod) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto pb-12 flex flex-col items-center justify-center min-h-[50vh] text-center">
          <Users className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
          <h2 className="text-2xl font-bold font-heading mb-2">No Pod Assigned</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            You haven't been assigned to a Pod yet. Contact your mentor or administrator to join a Pod and start learning with your peers.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto pb-12 space-y-8">
        
        {/* Header */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold uppercase tracking-wider">
                Pod Hub
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground">
              {data.pod.name}
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Mentored by <strong className="text-foreground">{data.mentor?.full_name || "Unassigned"}</strong>
            </p>
          </div>
          
          <PremiumCard glass gradientBorder className="px-8 py-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center gap-6">
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Pod Score</p>
              <div className="text-3xl font-bold text-indigo-500">{data.podScore.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">XP</span></div>
            </div>
            <Target className="w-10 h-10 text-purple-500 opacity-80" />
          </PremiumCard>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          
          {/* Main Column: Message Board */}
          <div className="lg:col-span-2 space-y-6">
            <PremiumCard glass className="p-6">
              <h2 className="text-2xl font-semibold flex items-center gap-2 mb-6">
                <MessageSquare className="text-primary w-6 h-6" /> Pod Board
              </h2>
              
              <PodMessageForm />

              <PodMessageList initialMessages={data.messages} podId={data.pod.id} />
            </PremiumCard>
          </div>

          {/* Sidebar: Roster */}
          <div className="space-y-6">
            <PremiumCard glass className="p-0 overflow-hidden">
              <div className="p-4 border-b border-border/40 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-secondary" /> Pod Roster
                </h3>
                <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-1 rounded-md">
                  {data.roster.length} members
                </span>
              </div>
              <div className="p-4 space-y-3">
                {data.roster.map((student, idx) => (
                  <div key={student.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-5 text-center font-bold text-xs text-muted-foreground">
                        {idx === 0 ? <Crown className="w-4 h-4 text-yellow-500 inline" /> : idx + 1}
                      </div>
                      <Avatar className="w-8 h-8 border border-border">
                        <AvatarFallback>{student.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm leading-none mb-1">{student.full_name}</div>
                        <div className="text-xs text-muted-foreground">Level {student.level}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary">{student.xp.toLocaleString()} XP</span>
                      {currentUserId && currentUserId !== student.id && (
                        <SelectBuddyButton buddyId={student.id} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </PremiumCard>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
