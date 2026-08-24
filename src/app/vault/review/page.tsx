"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { Textarea } from "@/components/ui/textarea";
import { Users, Loader2, ArrowLeft, ArrowRight, Video, CheckCircle2, MessageSquare, Target } from "lucide-react";
import Link from "next/link";
import { getPendingReviews, submitReview } from "@/app/actions/reviews";
import { motion, AnimatePresence } from "framer-motion";

export default function ReviewPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReview, setActiveReview] = useState<any>(null);
  
  const [strength, setStrength] = useState("");
  const [improvement, setImprovement] = useState("");
  const [score, setScore] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadReviews();
  }, []);

  async function loadReviews() {
    setLoading(true);
    try {
      const data = await getPendingReviews();
      setReviews(data || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!strength || !improvement || score === 0) return alert("Please fill out all fields and provide a score.");
    setIsSubmitting(true);
    try {
      // Just combine strength/improvement into feedback_text for now
      const feedback = `Strength: ${strength}\nImprovement: ${improvement}`;
      await submitReview(activeReview.id, feedback, strength, improvement, score);
      setActiveReview(null);
      setStrength(""); setImprovement(""); setScore(0);
      loadReviews();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center h-full"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto pb-24">
        <Link href="/vault/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Link>

        <div className="flex items-center gap-4 border-b border-border/50 pb-6 mb-8">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-heading">Pending Reviews</h1>
            <p className="text-muted-foreground">Help your peers grow by providing constructive feedback.</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!activeReview ? (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {reviews.length === 0 ? (
                <PremiumCard className="p-12 text-center shadow-xl glass-card">
                  <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">You're all caught up!</h2>
                  <p className="text-muted-foreground">No pending reviews at the moment.</p>
                </PremiumCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reviews.map(review => {
                    const submission = review.ritual?.submission?.[0];
                    return (
                      <PremiumCard key={review.id} className="p-6 shadow-md border-l-4 border-l-primary hover:scale-[1.02] transition-transform cursor-pointer" onClick={() => setActiveReview(review)}>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                              {review.review_type} REVIEW
                            </div>
                            <h3 className="text-xl font-bold">{review.reviewee?.full_name}</h3>
                            <p className="text-sm text-muted-foreground">{review.ritual?.word_card?.word}</p>
                          </div>
                          {submission?.video_url && (
                            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                              <Video className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <PremiumButton className="w-full">
                          Start Review <ArrowRight className="w-4 h-4 ml-2" />
                        </PremiumButton>
                      </PremiumCard>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="review-active" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left Side: Submission Video */}
                <div className="space-y-6">
                  <PremiumCard className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold font-heading">{activeReview.reviewee?.full_name}'s Submission</h3>
                      <div className="text-xs font-bold uppercase tracking-wider text-primary px-3 py-1 bg-primary/10 rounded-full">
                        {activeReview.review_type}
                      </div>
                    </div>
                    
                    <div className="aspect-video bg-black rounded-xl overflow-hidden border border-border/50 relative mb-4">
                      {activeReview.ritual?.submission?.[0]?.video_url ? (
                        <video 
                          src={activeReview.ritual.submission[0].video_url} 
                          controls 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                          No video available
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                      <h4 className="font-bold mb-1">Word of the Day</h4>
                      <p className="text-lg font-bold text-glow-primary">{activeReview.ritual?.word_card?.word}</p>
                      <p className="text-sm text-muted-foreground mt-1">{activeReview.ritual?.word_card?.meaning}</p>
                    </div>
                  </PremiumCard>
                </div>

                {/* Right Side: Feedback Form */}
                <div className="space-y-6">
                  <PremiumCard className="p-6 glass-card">
                    <div className="flex items-center gap-2 mb-2">
                      {activeReview.review_type === 'BUDDY' ? (
                        <span className="text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20">
                          🤝 In-Pod Buddy Review
                        </span>
                      ) : (
                        <span className="text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">
                          🌐 Cross-Pod External Review
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold font-heading mb-6 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-secondary" />
                      {activeReview.review_type === 'BUDDY' ? "Buddy Coaching & Growth" : "Objective Audience Evaluation"}
                    </h3>
                    
                    <div className="space-y-6">
                      {activeReview.review_type === 'BUDDY' ? (
                        <>
                          <div>
                            <label className="block text-sm font-bold mb-2">1. What did your buddy do well today?</label>
                            <Textarea 
                              placeholder="Highlight their positive effort, storytelling, or confidence..."
                              className="min-h-[90px] resize-none bg-background/50 border-primary/20"
                              value={strength}
                              onChange={e => setStrength(e.target.value)}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-bold mb-2">2. One challenge for tomorrow's ritual:</label>
                            <Textarea 
                              placeholder="Suggest one concrete goal for your buddy tomorrow..."
                              className="min-h-[90px] resize-none bg-background/50 border-primary/20"
                              value={improvement}
                              onChange={e => setImprovement(e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-bold mb-2">Daily Effort & Consistency Score (1-10)</label>
                            <div className="flex gap-2 flex-wrap">
                              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                <button
                                  key={n}
                                  onClick={() => setScore(n)}
                                  className={`w-10 h-10 rounded-full font-bold transition-all ${
                                    score === n 
                                      ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' 
                                      : 'bg-muted text-muted-foreground hover:bg-emerald-500/20 hover:text-emerald-400'
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="block text-sm font-bold mb-2">1. Delivery & Vocabulary Strengths:</label>
                            <Textarea 
                              placeholder="Evaluate their word precision, story clarity, and professional tone..."
                              className="min-h-[90px] resize-none bg-background/50 border-primary/20"
                              value={strength}
                              onChange={e => setStrength(e.target.value)}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-bold mb-2">2. Corporate Placement / Interview Polish Tip:</label>
                            <Textarea 
                              placeholder="What is the #1 thing to improve for executive-level presentations?..."
                              className="min-h-[90px] resize-none bg-background/50 border-primary/20"
                              value={improvement}
                              onChange={e => setImprovement(e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-bold mb-2">Professional Benchmark Score (1-10)</label>
                            <div className="flex gap-2 flex-wrap">
                              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                <button
                                  key={n}
                                  onClick={() => setScore(n)}
                                  className={`w-10 h-10 rounded-full font-bold transition-all ${
                                    score === n 
                                      ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                                      : 'bg-muted text-muted-foreground hover:bg-blue-500/20 hover:text-blue-400'
                                  }`}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      <div className="pt-6 border-t border-border/50 flex gap-4">
                        <PremiumButton variant="outline" className="flex-1" onClick={() => setActiveReview(null)}>
                          Cancel
                        </PremiumButton>
                        <PremiumButton className="flex-1" onClick={handleSubmit} disabled={isSubmitting || !strength || !improvement || score === 0}>
                          {isSubmitting ? "Submitting..." : "Submit Review"}
                        </PremiumButton>
                      </div>
                    </div>
                  </PremiumCard>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
