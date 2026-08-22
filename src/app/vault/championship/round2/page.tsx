"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { ArrowLeft, Video, Upload, CheckCircle2, Users } from "lucide-react";
import Link from "next/link";
import { VideoRecorder } from "@/components/video/VideoRecorder";

export default function Round2Challenge() {
  const [isUploading, setIsUploading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleVideoComplete = async (url: string) => {
    setIsUploading(true);
    // Simulate upload delay
    setTimeout(() => {
      setIsUploading(false);
      setCompleted(true);
    }, 2000);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-12">
        <Link href="/vault/championship" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Championship Hub
        </Link>

        {completed ? (
           <PremiumCard className="p-12 text-center glass-card border-t-8 border-t-amber-500">
             <CheckCircle2 className="w-24 h-24 text-success mx-auto mb-6" />
             <h1 className="text-4xl font-bold font-heading mb-2">Presentation Uploaded!</h1>
             <p className="text-xl text-muted-foreground mb-8">Your Pod's final presentation has been submitted to the Master Evaluators.</p>
             <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl max-w-md mx-auto mb-8">
               <h3 className="font-bold mb-2 text-amber-600">Pending Master Evaluation</h3>
               <p className="text-sm">Mentors and Faculty will now grade your Pod's performance. Keep an eye on the Leaderboard for the final results!</p>
             </div>
             <Link href="/vault/championship">
               <PremiumButton>Return to Hub</PremiumButton>
             </Link>
           </PremiumCard>
        ) : (
          <div className="space-y-8">
            <PremiumCard className="p-12 text-center glass-card border-b border-border/50 bg-gradient-to-br from-amber-500/5 to-transparent">
              <Users className="w-16 h-16 text-amber-500 mx-auto mb-6" />
              <h1 className="text-4xl font-bold font-heading mb-4">Round 2: Grand Pod Presentation</h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                Work with your Pod to deliver a seamless 16-minute story utilizing the vocabulary and leadership principles learned this month. Only ONE submission is required per Pod.
              </p>
            </PremiumCard>

            <PremiumCard className="p-8 md:p-12 glass-card text-center">
              {isUploading ? (
                <div className="flex flex-col items-center justify-center p-12">
                  <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-lg font-bold">Uploading Pod Presentation...</p>
                  <p className="text-sm text-muted-foreground">Please do not close this window.</p>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <h3 className="text-xl font-bold mb-2">Record Presentation</h3>
                    <p className="text-muted-foreground text-sm">Ensure all Pod members are present in the frame or on the call before starting.</p>
                  </div>
                  <div className="max-w-md mx-auto">
                    <VideoRecorder studentId="pod-submission" onUploadSuccess={handleVideoComplete} />
                  </div>
                </>
              )}
            </PremiumCard>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
