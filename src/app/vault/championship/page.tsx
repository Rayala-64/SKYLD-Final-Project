import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Trophy, Star, Crown, Users, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import Link from "next/link";

import { getActiveChallenge } from "@/app/actions/championship_admin";

export default async function ChampionshipHub() {
  const activeChallenge = await getActiveChallenge();
  const weekInfo: any = Array.isArray(activeChallenge?.championship_weeks)
    ? activeChallenge?.championship_weeks[0]
    : activeChallenge?.championship_weeks;
  const endDate = weekInfo?.end_date;
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-8">
        <section className="text-center py-12">
          <Badge className="mb-4 bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border-amber-500/50">SKYLD-LDOS Official Event</Badge>
          <h1 className="text-5xl font-heading font-bold text-foreground mb-4">
            Monthly Grand Championship
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The ultimate test of vocabulary, confidence, and storytelling. Compete as a Pod against the entire community for the Grand Trophy.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Round 1 */}
          <PremiumCard glass className="relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl">
                  <Star className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Round 1</CardTitle>
                  <CardDescription>Word Vault Master Challenge</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                A rapid-fire, high-pressure test of your individual mastery over the month's 150+ featured words.
              </p>
              
              <ul className="space-y-3">
                <li className="flex gap-3 text-sm">
                  <Badge variant="outline">Pronunciation</Badge>
                  <Badge variant="outline">Meaning</Badge>
                  <Badge variant="outline">Spelling</Badge>
                </li>
                <li className="flex gap-3 text-sm">
                  <Badge variant="outline">Synonyms</Badge>
                  <Badge variant="outline">Antonyms</Badge>
                  <Badge variant="outline">Usage</Badge>
                </li>
              </ul>
              
              <div className="p-4 bg-muted/50 rounded-xl border border-border/50 text-center">
                <Link href="/vault/championship/round1">
                  <PremiumButton className="w-full">Start Round 1 Challenge</PremiumButton>
                </Link>
              </div>
            </CardContent>
          </PremiumCard>

          {/* Round 2 */}
          <PremiumCard glass className="relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none" />
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-amber-500/20 text-amber-500 rounded-2xl">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Round 2</CardTitle>
                  <CardDescription>Grand Pod Presentation</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground text-sm">
                Together as a Pod, prepare to deliver a seamless 16-minute story utilizing the vocabulary and leadership principles learned this month.
              </p>

              {activeChallenge && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 text-left">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-500">
                    <span>🔥 Active Topic: {activeChallenge.theme || 'Innovation & Technology'}</span>
                    {endDate && (
                      <span className="text-[11px] font-normal text-muted-foreground">
                        Deadline: {new Date(endDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    <strong>{activeChallenge.title}:</strong> {activeChallenge.description}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center p-4 bg-background/50 rounded-xl border border-border/50">
                  <Users className="w-5 h-5 mb-2 text-primary" />
                  <span className="font-bold text-lg">8</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Members</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 bg-background/50 rounded-xl border border-border/50">
                  <Video className="w-5 h-5 mb-2 text-primary" />
                  <span className="font-bold text-lg">16m</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Time</span>
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-xl border border-border/50 text-center mt-6">
                <Link href="/vault/championship/round2">
                  <PremiumButton className="w-full bg-amber-500 hover:bg-amber-600 text-white">Start Round 2 Presentation</PremiumButton>
                </Link>
              </div>
            </CardContent>
          </PremiumCard>
        </div>

        <section className="mt-12 text-center">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 mb-4">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Grand Championship Scoring</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            The Grand Championship is worth a massive <strong className="text-primary">150 Points</strong> towards your Pod's overall SKYLD-LDOS leaderboard score. Prepare daily.
          </p>
        </section>
      </div>
    </DashboardLayout>
  );
}
