"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { ArrowLeft, CheckCircle2, Users, Crown, Video, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";
import { VideoRecorder } from "@/components/video/VideoRecorder";
import { getPodChallengeStatus, submitPodChallenge } from "@/app/actions/championships";
import { getActiveChallenge } from "@/app/actions/championship_admin";

export default function Round2Challenge() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [description, setDescription] = useState("");
  
  const [challenge, setChallenge] = useState<any>(null);
  const [podId, setPodId] = useState<string | null>(null);
  const [podName, setPodName] = useState<string>("Your Pod");
  const [isLeader, setIsLeader] = useState<boolean>(false);
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
      <div className="max-w-4xl mx-auto pb-16">
        <Link href="/vault/championship" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Championship Hub
        </Link>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
          </div>
        ) : isSubmitted ? (
          <PremiumCard className="p-12 text-center glass-card border-t-8 border-t-amber-500 shadow-2xl">
            <CheckCircle2 className="w-20 h-20 text-emerald-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold font-heading mb-2">Presentation Uploaded!</h1>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Your Pod's 16-minute collaborative presentation has been submitted to the Master Evaluators.
            </p>

            {submission?.video_url && (
              <div className="max-w-2xl mx-auto mb-6 aspect-video bg-black rounded-2xl overflow-hidden border border-border/50 shadow-2xl">
                <video src={submission.video_url} controls className="w-full h-full object-cover" />
              </div>
            )}

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-500 mb-8">
              👑 Submitted on behalf of {podName} by {leaderName}
            </div>

            <div className="block">
              <Link href="/vault/championship">
                <PremiumButton>Return to Hub</PremiumButton>
              </Link>
            </div>
          </PremiumCard>
        ) : (
          <div className="space-y-8">
            <PremiumCard className="p-10 text-center glass-card border-b border-border/50 bg-gradient-to-br from-amber-500/10 to-transparent">
              <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-bold font-heading mb-3">Round 2: Grand Pod Presentation</h1>
              <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Work with your 8-member Pod to deliver a seamless 16-minute story utilizing the vocabulary and leadership principles learned this month.
              </p>
            </PremiumCard>

            {isLeader ? (
              <PremiumCard className="p-8 md:p-10 glass-card border border-amber-500/30 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full border border-amber-500/30 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5" /> Pod Leader Uploader
                  </span>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-2xl font-bold font-heading mb-1">Upload 16-Min Team Presentation</h3>
                  <p className="text-sm text-muted-foreground">
                    As the elected Pod Leader for <strong>{podName}</strong>, you are authorized to compile and submit the official 16-minute video.
                  </p>
                </div>

                {videoUrl ? (
                  <div className="space-y-6">
                    <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-border/50 shadow-2xl">
                      <video src={videoUrl} controls className="w-full h-full object-cover" />
                    </div>

                    <div className="space-y-3">
                      <label className="block text-sm font-semibold">Submission Notes</label>
                      <textarea 
                        className="w-full bg-background/50 border border-border rounded-xl p-4 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        placeholder="Add member timestamps, speaking order, or notes for the Master Evaluators..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-4">
                      <PremiumButton variant="outline" className="flex-1" onClick={() => setVideoUrl(null)}>
                        Retake / Change Video
                      </PremiumButton>
                      <PremiumButton 
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold" 
                        onClick={handleSubmit} 
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Submitting..." : "Submit to Master Judges"}
                      </PremiumButton>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-md mx-auto mt-4">
                    <VideoRecorder studentId="pod-submission" onUploadSuccess={(url) => setVideoUrl(url)} />
                  </div>
                )}
              </PremiumCard>
            ) : (
              <PremiumCard className="p-10 glass-card border border-amber-500/20 text-center space-y-6 shadow-xl">
                <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 mx-auto">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                    Team Collaboration Mode
                  </span>
                  <h3 className="text-2xl font-bold mt-3">Designated Pod Leader</h3>
                  <p className="text-xl font-bold text-amber-400 mt-1 flex items-center justify-center gap-2">
                    <Crown className="w-5 h-5 text-amber-400" /> {leaderName}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
                  Each member of <strong>{podName}</strong> presents a 2-minute section (8 members &times; 2 mins = 16 mins). Your elected Pod Leader (<strong>{leaderName}</strong>) is authorized to compile and submit the official video.
                </p>
                <div className="pt-4 text-xs text-muted-foreground border-t border-border/40 max-w-md mx-auto">
                  Once uploaded by {leaderName}, you will be able to preview the team video and track the mentor evaluation here.
                </div>
              </PremiumCard>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
