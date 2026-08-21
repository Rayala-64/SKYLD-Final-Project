"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { Target, CheckCircle2, ShieldAlert, ArrowRight, Video, ClipboardList } from "lucide-react";
import Link from "next/link";
import { submitMasterEvaluation } from "@/app/actions/championships";

export default function MentorEvaluationsPage() {
  const [activePod, setActivePod] = useState<any>(null);
  const [score, setScore] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // In a real app, this would be fetched from the database based on the mentor's assignments
  // Mock data for Phase 3 UI demonstration
  const dummyPods = [
    {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Pod Alpha",
      unit: "Phoenix Unit",
      challenge_title: "Innovation & Technology",
      video_url: "https://www.w3schools.com/html/mov_bbb.mp4",
      status: "PENDING"
    },
    {
      id: "00000000-0000-0000-0000-000000000002",
      name: "Pod Bravo",
      unit: "Phoenix Unit",
      challenge_title: "Innovation & Technology",
      video_url: null,
      status: "WAITING_FOR_SUBMISSION"
    }
  ];

  const handleSubmit = async () => {
    if (score === 0 || !feedback) return alert("Please provide a score and feedback.");
    setIsSubmitting(true);
    try {
      // Hardcoded week ID for demo
      await submitMasterEvaluation("00000000-0000-0000-0000-000000000001", activePod.id, score, feedback);
      
      // Mark as completed locally
      
      setActivePod(null);
      setScore(0);
      setFeedback("");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto pb-24">
        
        <div className="flex items-center gap-4 border-b border-border/50 pb-6 mb-8">
          <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-500">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-heading">Master Evaluations</h1>
            <p className="text-muted-foreground">Review and score your assigned Pods for the weekly championship challenge.</p>
          </div>
        </div>

        {!activePod ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dummyPods.map((pod) => (
              <PremiumCard key={pod.id} className={`p-6 ${pod.status === 'COMPLETED' ? 'opacity-70 grayscale' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{pod.unit}</span>
                    <h3 className="text-xl font-bold font-heading">{pod.name}</h3>
                  </div>
                  {pod.status === 'PENDING' && (
                    <span className="bg-warning/20 text-warning text-xs font-bold px-2 py-1 rounded-full uppercase">Needs Review</span>
                  )}
                  {pod.status === 'WAITING_FOR_SUBMISSION' && (
                    <span className="bg-muted text-muted-foreground text-xs font-bold px-2 py-1 rounded-full uppercase">No Submission</span>
                  )}
                  {pod.status === 'COMPLETED' && (
                    <span className="bg-success/20 text-success text-xs font-bold px-2 py-1 rounded-full uppercase">Evaluated</span>
                  )}
                </div>
                
                <div className="mb-6">
                  <h4 className="text-sm font-semibold mb-1">Week 3 Challenge</h4>
                  <p className="text-sm text-muted-foreground">{pod.challenge_title}</p>
                </div>

                <PremiumButton 
                  className="w-full" 
                  disabled={pod.status !== 'PENDING'}
                  onClick={() => setActivePod(pod)}
                >
                  {pod.status === 'PENDING' ? "Start Evaluation" : pod.status === 'COMPLETED' ? "Evaluated" : "Waiting"} 
                  {pod.status === 'PENDING' && <ArrowRight className="w-4 h-4 ml-2" />}
                </PremiumButton>
              </PremiumCard>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Video */}
            <div className="space-y-6">
              <PremiumCard className="p-6 border-l-4 border-l-indigo-500">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold font-heading">{activePod.name} Submission</h3>
                  <span className="text-xs font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-500 px-3 py-1 rounded-full">
                    MASTER EVALUATION
                  </span>
                </div>
                
                <div className="aspect-video bg-black rounded-xl overflow-hidden border border-border/50 relative mb-4">
                  {activePod.video_url ? (
                    <video src={activePod.video_url} controls className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      No video available
                    </div>
                  )}
                </div>
              </PremiumCard>
            </div>

            {/* Right: Scoring Form */}
            <div className="space-y-6">
              <PremiumCard className="p-6 glass-card">
                <h3 className="text-xl font-bold font-heading mb-6 flex items-center gap-2">
                  <Target className="w-5 h-5 text-indigo-500" /> Score & Feedback
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold mb-2">Master Evaluation Score (0-10)</label>
                    <p className="text-xs text-muted-foreground mb-4">Evaluate the Pod's collective performance. Your score will be averaged with other mentors in your Ownership Team.</p>
                    <div className="flex gap-2 flex-wrap">
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <button
                          key={n}
                          onClick={() => setScore(n)}
                          className={`w-10 h-10 rounded-full font-bold transition-all ${
                            score === n 
                              ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' 
                              : 'bg-muted text-muted-foreground hover:bg-indigo-500/20 hover:text-indigo-500'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">Pod Feedback</label>
                    <textarea 
                      placeholder="Provide constructive feedback for the entire Pod..."
                      className="w-full bg-background/50 border border-border rounded-xl p-4 text-sm min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                    />
                  </div>

                  <div className="pt-6 border-t border-border/50 flex gap-4">
                    <PremiumButton variant="outline" className="flex-1" onClick={() => setActivePod(null)}>
                      Cancel
                    </PremiumButton>
                    <PremiumButton className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white" onClick={handleSubmit} disabled={isSubmitting || score === 0 || !feedback}>
                      {isSubmitting ? "Submitting..." : "Submit Master Score"}
                    </PremiumButton>
                  </div>
                </div>
              </PremiumCard>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
