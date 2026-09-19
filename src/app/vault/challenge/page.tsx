"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { PodVideoUploader } from "@/components/video/PodVideoUploader";
import { submitPodChallenge, getPodChallengeStatus } from "@/app/actions/championships";
import { getActiveChallenge } from "@/app/actions/championship_admin";
import { Target, Users, ArrowLeft, Trophy, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function WeeklyChallengePage() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [description, setDescription] = useState("");
  
  const [challenge, setChallenge] = useState<any>(null);
  const [podId, setPodId] = useState<string | null>(null);
  const [podName, setPodName] = useState<string>("Your Pod");
  const [isLeader, setIsLeader] = useState<boolean>(true);
  const [leaderName, setLeaderName] = useState<string>("Pod Leader");
  const [submission, setSubmission] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const activeChallenge = await getActiveChallenge();
        setChallenge(activeChallenge);
        
        if (activeChallenge) {
          const status = await getPodChallengeStatus(activeChallenge.id);
          if (status) {
            setPodId(status.podId);
            setPodName(status.podName || "Your Pod");
            setIsSubmitted(status.hasSubmitted);
            setIsLeader(status.isLeader);
            setLeaderName(status.leaderName || "Pod Leader");
            setSubmission(status.submission);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSubmit = async () => {
    if (!videoUrl || !challenge || !podId) return;
    setIsSubmitting(true);
    try {
      await submitPodChallenge(challenge.id, podId, videoUrl, description);
      setIsSubmitted(true);
      setSubmission({ video_url: videoUrl, description });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto pb-24">
        <Link href="/vault/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Link>

        <div className="flex items-center gap-4 border-b border-border/50 pb-6 mb-8">
          <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-500">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-heading">Weekly Pod Challenge</h1>
            <p className="text-muted-foreground">Collaborate with your 8-member Pod and submit your 16-minute presentation.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !challenge ? (
          <PremiumCard className="p-12 text-center shadow-xl glass-card">
            <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold mb-2">No Active Challenges</h2>
            <p className="text-muted-foreground mb-8">Your Pod does not have any active weekly challenges at this time. Check back later!</p>
            <PremiumButton asChild>
                <Link href="/vault/dashboard">Return to Dashboard</Link>
            </PremiumButton>
          </PremiumCard>
        ) : isSubmitted ? (
          <div className="space-y-8">
            <PremiumCard className="p-8 text-center shadow-xl glass-card border border-emerald-500/30">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-3" />
              <h2 className="text-2xl font-bold mb-1">Weekly Challenge Submitted!</h2>
              <p className="text-muted-foreground mb-6">
                Your Pod's 16-minute collaborative presentation is safely uploaded and awaiting Mentor evaluation.
              </p>
              
              {submission?.video_url && (
                <div className="max-w-2xl mx-auto mb-6 aspect-video bg-black rounded-2xl overflow-hidden border border-border/50 shadow-2xl">
                  <video src={submission.video_url} controls className="w-full h-full object-cover" />
                </div>
              )}

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
                👑 Submitted on behalf of {podName} by {leaderName}
              </div>
            </PremiumCard>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <PremiumCard className="p-6 border-l-4 border-l-purple-500">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-warning" /> {challenge.title}
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-sm text-muted-foreground mb-1">Theme</h4>
                    <p className="font-semibold">{challenge.theme}</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-muted-foreground mb-1">Task</h4>
                    <p className="text-sm whitespace-pre-wrap">{challenge.description}</p>
                  </div>
                  <div className="bg-primary/10 p-4 rounded-xl border border-primary/20 text-sm">
                    <strong className="block mb-1 text-primary">Rules:</strong>
                    <ul className="list-disc pl-4 space-y-1 text-primary/80">
                      {challenge.instructions?.split('\n').map((rule: string, i: number) => (
                        <li key={i}>{rule}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </PremiumCard>

              {isLeader && (
                <PremiumCard className="p-6">
                  <h3 className="text-lg font-bold mb-4">Submission Notes</h3>
                  <textarea 
                    className="w-full bg-background/50 border border-border rounded-xl p-4 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Add team member names, topic breakdown, or notes for the Mentor..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </PremiumCard>
              )}
            </div>

            <div className="space-y-6">
              {isLeader ? (
                <PremiumCard className="p-6 glass-card border border-primary/30">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider bg-primary/20 text-primary px-3 py-1 rounded-full border border-primary/30">
                      👑 Pod Leader Uploader
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" /> Upload 16-Min Presentation
                  </h3>
                  <p className="text-xs text-muted-foreground mb-6">
                    As the designated Pod Leader for <strong>{podName}</strong>, upload your team's compiled 16-minute video presentation.
                  </p>
                  
                  {videoUrl ? (
                    <div className="space-y-6">
                      <div className="aspect-video bg-black rounded-xl overflow-hidden border border-border/50">
                        <video src={videoUrl} controls className="w-full h-full object-cover" />
                      </div>
                      
                      <div className="flex gap-4">
                        <PremiumButton variant="outline" className="flex-1" onClick={() => setVideoUrl(null)}>
                          Retake / Change Video
                        </PremiumButton>
                        <PremiumButton className="flex-1 bg-purple-500 hover:bg-purple-600 text-white" onClick={handleSubmit} disabled={isSubmitting}>
                          {isSubmitting ? "Submitting..." : "Submit to Mentor"}
                        </PremiumButton>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <PodVideoUploader 
                        podId={podId || "pod-beta"} 
                        onUploadSuccess={(url) => setVideoUrl(url)} 
                      />
                    </div>
                  )}
                </PremiumCard>
              ) : (
                <PremiumCard className="p-8 glass-card border border-amber-500/20 text-center space-y-4">
                  <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 mx-auto">
                    <Users className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                      Team Collaboration Mode
                    </span>
                    <h3 className="text-xl font-bold mt-3">Designated Pod Leader</h3>
                    <p className="text-lg font-semibold text-primary mt-1">👑 {leaderName}</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                    Each member of <strong>{podName}</strong> presents a 2-minute section. Your elected Pod Leader ({leaderName}) is authorized to compile and submit the final 16-minute video.
                  </p>
                  <div className="pt-2 text-xs text-muted-foreground border-t border-border/40">
                    Once uploaded by {leaderName}, you will be able to preview the team video and mentor score here.
                  </div>
                </PremiumCard>
              )}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
