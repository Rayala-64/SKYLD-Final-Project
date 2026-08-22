"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { VideoRecorder } from "@/components/video/VideoRecorder";
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
            setIsSubmitted(status.hasSubmitted);
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
            <p className="text-muted-foreground">Collaborate with your Pod and submit your presentation for up to 10 points.</p>
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
          <PremiumCard className="p-12 text-center shadow-xl glass-card">
            <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Submission Received!</h2>
            <p className="text-muted-foreground mb-8">Your Pod's collaborative challenge has been submitted for evaluation.</p>
            <PremiumButton asChild>
                <Link href="/vault/dashboard">Return to Dashboard</Link>
            </PremiumButton>
          </PremiumCard>
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

              <PremiumCard className="p-6">
                <h3 className="text-lg font-bold mb-4">Submission Details</h3>
                <textarea 
                  className="w-full bg-background/50 border border-border rounded-xl p-4 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Add any notes for the evaluators..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </PremiumCard>
            </div>

            <div className="space-y-6">
              <PremiumCard className="p-6 glass-card">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> Record Presentation
                </h3>
                
                {videoUrl ? (
                  <div className="space-y-6">
                    <div className="aspect-video bg-black rounded-xl overflow-hidden border border-border/50">
                      <video src={videoUrl} controls className="w-full h-full object-cover" />
                    </div>
                    
                    <div className="flex gap-4">
                      <PremiumButton variant="outline" className="flex-1" onClick={() => setVideoUrl(null)}>
                        Retake Video
                      </PremiumButton>
                      <PremiumButton className="flex-1 bg-purple-500 hover:bg-purple-600 text-white" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? "Submitting..." : "Submit to Judges"}
                      </PremiumButton>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <VideoRecorder 
                      studentId="pod-submission" 
                      onUploadSuccess={(url) => setVideoUrl(url)} 
                    />
                  </div>
                )}
              </PremiumCard>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
