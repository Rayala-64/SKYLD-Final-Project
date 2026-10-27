import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { createClient } from "@/utils/supabase/server";
import { BookOpen, Star, Calendar } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all completed submissions with word details
  const { data: submissions } = await supabase
    .from("submissions")
    .select(`
      id,
      date,
      points_earned,
      status,
      reflection_ai_feedback,
      video_ai_feedback,
      daily_ritual_id,
      video_url,
      word_cards ( word, definition, example_sentence )
    `)
    .eq("user_id", user.id)
    .eq("status", "submitted")
    .order("date", { ascending: false });

  const history = submissions || [];

  // Fetch human reviews for these submissions
  const ritualIds = history.map(s => s.daily_ritual_id).filter(Boolean);
  let humanReviews: any[] = [];
  if (ritualIds.length > 0) {
    const { data: reviews } = await supabase
      .from("ritual_reviews")
      .select(`
        ritual_id,
        review_type,
        feedback_text,
        score,
        reviewer:users!ritual_reviews_reviewer_id_fkey(full_name)
      `)
      .eq("reviewee_id", user.id)
      .eq("status", "completed")
      .in("ritual_id", ritualIds);
    humanReviews = reviews || [];
  }

  const enrichedHistory = history.map(sub => {
    const reviewsForSub = humanReviews.filter(r => r.ritual_id === sub.daily_ritual_id);
    return { ...sub, human_reviews: reviewsForSub };
  });

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto pb-12 space-y-8">
        
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-heading text-foreground flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-primary" /> Learning History
            </h1>
            <p className="text-muted-foreground mt-1">Review your past submissions and AI feedback.</p>
          </div>
        </header>

        <div className="space-y-6">
          {enrichedHistory.length === 0 ? (
            <PremiumCard glass className="p-12 text-center border-dashed">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No History Yet</h3>
              <p className="text-muted-foreground mb-6">Complete your first daily mission to start building your vault.</p>
              <Link href="/vault/dashboard" className="text-primary hover:underline font-medium">
                Go to Dashboard
              </Link>
            </PremiumCard>
          ) : (
            enrichedHistory.map((sub: any) => (
              <PremiumCard key={sub.id} glass className="p-6 overflow-hidden relative">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Left Column: Word Info */}
                  <div className="md:w-1/3 space-y-2 border-b md:border-b-0 md:border-r border-border/50 pb-4 md:pb-0 md:pr-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="w-4 h-4" /> {new Date(sub.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                    <h2 className="text-3xl font-bold font-heading text-glow-primary">{sub.word_cards?.word}</h2>
                    <p className="text-muted-foreground italic text-sm line-clamp-3">
                      {sub.word_cards?.definition}
                    </p>
                  </div>
                  
                  {/* Right Column: Feedback */}
                  <div className="md:w-2/3 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">AI Insights</h3>
                      <div className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-3 py-1 rounded-full text-sm font-bold">
                        <Star className="w-4 h-4 fill-yellow-500" /> {sub.points_earned} XP
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Reflection Feedback */}
                      <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Written Reflection</h4>
                        <div className="text-2xl font-bold mb-1">
                          {sub.reflection_ai_feedback ? (
                            <>{(sub.reflection_ai_feedback as any).score}<span className="text-sm text-muted-foreground font-normal">/10</span></>
                          ) : (
                            <span className="text-sm text-muted-foreground font-normal">Pending</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {(sub.reflection_ai_feedback as any)?.comment || (sub.reflection_ai_feedback as any)?.improvement_suggestions?.[0] || "Pending AI review."}
                        </p>
                      </div>

                      {/* Video Feedback */}
                      <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Spoken Fluency</h4>
                        <div className="text-2xl font-bold mb-1">
                          {!sub.video_url ? (
                            <span className="text-sm text-muted-foreground font-normal">N/A</span>
                          ) : sub.video_ai_feedback ? (
                            <>{(sub.video_ai_feedback as any).fluency}<span className="text-sm text-muted-foreground font-normal">/100</span></>
                          ) : (
                            <span className="text-sm text-muted-foreground font-normal">Pending</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {!sub.video_url ? "No video recorded." : (sub.video_ai_feedback as any)?.suggestion || "Pending AI review."}
                        </p>
                      </div>
                    </div>

                    {/* Human Peer/Buddy Feedback */}
                    {sub.human_reviews && sub.human_reviews.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-border/50">
                        <h3 className="font-semibold mb-4 text-glow">Peer & Buddy Feedback</h3>
                        <div className="space-y-4">
                          {sub.human_reviews.map((rev: any, idx: number) => (
                            <div key={idx} className="bg-primary/5 p-4 rounded-xl border border-primary/20 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl -mr-16 -mt-16" />
                              <div className="flex justify-between items-start mb-2 relative z-10">
                                <h4 className="text-sm font-semibold text-primary capitalize flex items-center gap-2">
                                  {rev.review_type.toLowerCase()} Review
                                  <span className="text-xs font-normal text-muted-foreground">- {rev.reviewer?.full_name}</span>
                                </h4>
                                <div className="text-sm font-bold bg-background/80 px-2 py-1 rounded text-primary border border-primary/20">
                                  {rev.score}/10
                                </div>
                              </div>
                              <p className="text-sm text-foreground/90 italic relative z-10 leading-relaxed">"{rev.feedback_text}"</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </PremiumCard>
            ))
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
