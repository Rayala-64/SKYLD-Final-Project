"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, PenTool, Mic, Sparkles, CheckCircle2, ArrowLeft, ArrowRight, Loader2, Target, Lightbulb, Users, MessageSquare } from "lucide-react";
import { ProgressRing } from "@/components/ui/custom/ProgressRing";
import { VideoRecorder } from "@/components/video/VideoRecorder";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { WordCard16 } from "@/components/vault/WordCard16";
import { getOrCreateDailyRitual, submitRitualStep, submitDailyMissionV2 } from "@/app/actions/daily_ritual";
import { triggerConfetti } from "@/lib/confetti";

export default function LearnPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  const [studentId, setStudentId] = useState<string | null>(null);
  const [wordData, setWordData] = useState<any>(null);
  const [ritual, setRitual] = useState<any>(null);
  
  // Mission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [applySentence, setApplySentence] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const supabase = createClient();

  const determineCurrentStep = (steps: any[]) => {
    // Find the highest completed step
    let highest = 1;
    for (const step of steps) {
      if (step.status === 'completed' && step.step_number > highest) {
        highest = step.step_number;
      }
    }
    
    // If we completed 10, stay on 10. Else go to the next uncompleted step
    if (highest === 10) setCurrentStep(10);
    else setCurrentStep(highest + 1);
  };

  const loadMission = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setStudentId(user.id);

      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const { data: word } = await supabase.from("word_cards").select("*").eq("active_date", today).single();
      
      if (!word) {
        setWordData(null);
        setIsLoading(false);
        return;
      }
      setWordData(word);

      // Get or Create Daily Ritual state machine
      const currentRitual = await getOrCreateDailyRitual(user.id, word.id, today);
      setRitual(currentRitual);

      // Auto-mark Step 1 (Open Vault) if not done
      const step1 = currentRitual.steps?.find((s:any) => s.step_number === 1);
      if (!step1) {
        await submitRitualStep(currentRitual.id, 1, 'OPEN_WORD_VAULT', 0);
        // Refresh ritual
        const updated = await getOrCreateDailyRitual(user.id, word.id, today);
        setRitual(updated);
      }

      // Determine current active step based on completed steps
      determineCurrentStep(currentRitual.steps || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMission();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);



  const handleNextStep = async (stepNumber: number, stepType: string, points: number) => {
    if (!ritual) return;
    setIsSubmitting(true);
    try {
      // If Step 5, we also need to submit the actual video artifact
      if (stepNumber === 5) {
        const isCorrect = wordData?.activity?.questions?.[0] 
          ? quizAnswer === wordData.activity.questions[0].correctAnswer
          : (quizAnswer === wordData.meaning || quizAnswer === wordData.definition);
        
        await submitDailyMissionV2(studentId!, wordData.id, applySentence, videoUrl || "", isCorrect, ritual.id);
        triggerConfetti();
      }

      if (stepNumber === 9) {
        triggerConfetti();
      }

      // Submit state machine step
      await submitRitualStep(ritual.id, stepNumber, stepType, points);
      
      // Reload ritual state
      const updated = await getOrCreateDailyRitual(studentId!, wordData.id, ritual.ritual_date);
      setRitual(updated);
      determineCurrentStep(updated.steps);
      
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <DashboardLayout><div className="flex items-center justify-center h-full"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div></DashboardLayout>;
  }

  if (!wordData) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-6">
          <BookOpen className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-2xl font-bold">No Mission Today</h2>
          <p className="text-muted-foreground">Check back later for your next word.</p>
          <Link href="/vault/dashboard" className={buttonVariants({ variant: "default" })}>Return to Dashboard</Link>
        </div>
      </DashboardLayout>
    );
  }

  const fallbackOptions = wordData ? [wordData.definition || wordData.meaning, "A rare type of mineral found in deep caves", "To quickly run away from danger", "The process of creating something new"] : [];
  const quizOptions = wordData?.activity?.questions?.[0]?.options || fallbackOptions;
  const completedSteps = currentStep === 10 ? 10 : (ritual?.steps?.length || 1);
  const stepProgress = (completedSteps / 10) * 100;
  
  // Calculate total points earned in this ritual
  const totalPoints = ritual?.total_points || 0;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-24">
        <Link href="/vault/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Link>

        {/* 10-Step Progress Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 bg-card/50 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-sm gap-6">
          <div className="flex items-center gap-4">
            <ProgressRing progress={stepProgress} size={60} strokeWidth={4} />
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">SKYLD-LDOS Workflow</p>
              <h2 className="text-xl font-bold">Daily Ritual</h2>
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            {/* Dots */}
            <div className="flex gap-2">
              {[1,2,3,4,5,6,7,8,9,10].map((s) => (
                <div key={s} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 ${
                    s <= completedSteps ? 'bg-primary text-primary-foreground shadow-[0_0_10px_rgba(var(--primary),0.5)]' : 'bg-muted text-muted-foreground'
                  }`}>
                  {s}
                </div>
              ))}
            </div>
            {/* Stats */}
            <div className="flex gap-6 text-sm font-medium">
              <div>Progress: <span className="text-primary">{completedSteps} / 10</span> steps</div>
              <div>Score: <span className="text-primary">{totalPoints} / 10</span> points</div>
            </div>
          </div>
        </div>

        <div className="relative min-h-[500px]">
          <AnimatePresence mode="wait">
            
            {/* STEP 2: Learn */}
            {currentStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <PremiumCard className="p-4 md:p-8 border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-xl glass-card">
                  <div className="flex items-center gap-3 text-primary mb-6">
                    <BookOpen className="w-6 h-6 drop-shadow-md" />
                    <span className="font-semibold uppercase tracking-wider text-sm drop-shadow-sm">Step 2: Learn the Word</span>
                  </div>
                  <WordCard16 wordData={wordData} />
                  <PremiumButton onClick={() => handleNextStep(2, 'LEARN_WORD', 0)} disabled={isSubmitting} className="w-full text-lg h-14 mt-8">
                    I understand this word <ArrowRight className="w-5 h-5 ml-2" />
                  </PremiumButton>
                </PremiumCard>
              </motion.div>
            )}

            {/* STEP 3: Knowledge Challenge */}
            {currentStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <PremiumCard className="p-8 md:p-12 shadow-xl glass-card">
                  <div className="flex items-center gap-3 text-blue-500 mb-6">
                    <Target className="w-6 h-6 drop-shadow-md" />
                    <span className="font-semibold uppercase tracking-wider text-sm drop-shadow-sm">Step 3: Knowledge Challenge</span>
                  </div>
                  <div className="space-y-8">
                    <div className="text-center">
                      <h2 className="text-3xl font-bold font-heading mb-2">
                        {wordData?.activity?.questions?.[0]?.text || "What does it mean?"}
                      </h2>
                    </div>
                    <div className="space-y-4 max-w-2xl mx-auto">
                      {quizOptions.map((opt: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setQuizAnswer(opt)}
                          className={`w-full p-6 text-left rounded-2xl border-2 transition-all ${
                            quizAnswer === opt ? 'border-primary bg-primary/10' : 'border-border/50 hover:border-primary/50 bg-card hover:bg-muted/50'
                          }`}
                        >
                          <span className="text-lg font-medium">{opt}</span>
                        </button>
                      ))}
                    </div>
                    <PremiumButton onClick={() => handleNextStep(3, 'KNOWLEDGE_CHALLENGE', 0)} disabled={!quizAnswer || isSubmitting} className="w-full text-lg h-14 mt-8">
                      Continue <ArrowRight className="w-5 h-5 ml-2" />
                    </PremiumButton>
                  </div>
                </PremiumCard>
              </motion.div>
            )}

            {/* STEP 4: Communication Challenge */}
            {currentStep === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <PremiumCard className="p-8 md:p-12 shadow-xl glass-card">
                  <div className="flex items-center gap-3 text-amber-500 mb-6">
                    <Lightbulb className="w-6 h-6 drop-shadow-md" />
                    <span className="font-semibold uppercase tracking-wider text-sm drop-shadow-sm">Step 4: Communication Challenge</span>
                  </div>
                  <div className="space-y-6">
                    <h2 className="text-3xl font-bold font-heading">Prepare a sentence or speech</h2>
                    <p className="text-muted-foreground text-lg">
                      Create an original sentence or short 30s speech using <strong className="text-glow-primary">{wordData?.word.toLowerCase()}</strong>.
                    </p>
                    <Textarea 
                      placeholder={`Draft your communication here...`}
                      className="min-h-[100px] text-lg p-6 rounded-2xl bg-background/50 border-primary/20"
                      value={applySentence}
                      onChange={(e) => setApplySentence(e.target.value)}
                    />
                    <PremiumButton onClick={() => handleNextStep(4, 'COMMUNICATION_CHALLENGE', 0)} disabled={applySentence.length < 5 || isSubmitting} className="w-full h-14">
                      Continue <ArrowRight className="w-5 h-5 ml-2" />
                    </PremiumButton>
                  </div>
                </PremiumCard>
              </motion.div>
            )}

            {/* STEP 5: Record & Upload (+3 pts) */}
            {currentStep === 5 && (
              <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <PremiumCard className="p-8 md:p-12 shadow-xl glass-card bg-gradient-to-br from-card to-destructive/5 border-destructive/20">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3 text-destructive">
                      <Mic className="w-6 h-6 drop-shadow-md" />
                      <span className="font-semibold uppercase tracking-wider text-sm drop-shadow-sm">Step 5: Record & Upload</span>
                    </div>
                    <div className="bg-destructive/10 text-destructive font-bold px-3 py-1 rounded-full text-sm">
                      +3 Points
                    </div>
                  </div>
                  
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-3xl font-bold font-heading mb-2">Speak and record</h2>
                      <p className="text-muted-foreground text-lg">
                        Record yourself delivering the communication challenge you just prepared for the word <strong className="text-glow-primary">{wordData?.word}</strong>.
                      </p>
                    </div>
                    
                    <VideoRecorder 
                      studentId={studentId!} 
                      onUploadSuccess={(url: string) => setVideoUrl(url)} 
                    />

                    <div className="flex justify-between items-center mt-8 pt-6 border-t border-border/50">
                      <span className={`text-sm font-medium ${!videoUrl ? 'text-destructive' : 'text-green-500 flex items-center gap-2'}`}>
                        {videoUrl ? <><CheckCircle2 className="w-4 h-4" /> Ready to submit</> : "Video required"}
                      </span>
                      <PremiumButton 
                        size="lg" 
                        onClick={() => handleNextStep(5, 'RECORD_UPLOAD', 3)} 
                        disabled={!videoUrl || isSubmitting}
                      >
                        {isSubmitting ? "Submitting..." : "Submit Artifact"} <Sparkles className="w-4 h-4 ml-2" />
                      </PremiumButton>
                    </div>
                  </div>
                </PremiumCard>
              </motion.div>
            )}

            {/* STEPS 6-10: Pending Social Workflow */}
            {currentStep > 5 && (
              <motion.div key="pending" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <PremiumCard className="p-12 text-center shadow-2xl glass-card border-primary/20 bg-gradient-to-b from-card to-primary/5">
                  <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(var(--primary),0.3)]">
                    {currentStep === 10 ? <CheckCircle2 className="w-12 h-12 text-primary" /> : <Users className="w-12 h-12 text-primary animate-pulse" />}
                  </div>
                  
                  <h2 className="text-3xl font-bold font-heading mb-4">
                    {currentStep === 6 && "Waiting for Buddy Review"}
                    {currentStep === 7 && "Waiting for Peer Review"}
                    {currentStep === 8 && "Action Required: Acknowledge Feedback"}
                    {currentStep === 9 && "Action Required: Buddy Reflection"}
                    {currentStep === 10 && "Daily Ritual Complete!"}
                  </h2>
                  
                  <p className="text-xl text-muted-foreground mb-12 max-w-lg mx-auto">
                    {currentStep === 6 && "Your Buddy needs to review your video submission to unlock the next step."}
                    {currentStep === 7 && "A random peer needs to review your video submission."}
                    {currentStep === 8 && "You have received feedback! Review and acknowledge it."}
                    {currentStep === 9 && "Have a 1-on-1 reflection with your buddy about today's learning."}
                    {currentStep === 10 && "Amazing work! You've successfully completed the 10-step LDOS workflow."}
                  </p>
                  
                  {(currentStep === 8 || currentStep === 9) ? (
                    <PremiumButton size="lg" className="px-8 py-6 text-lg" onClick={() => handleNextStep(currentStep, currentStep === 8 ? 'ACKNOWLEDGE_APPRECIATE' : 'BUDDY_REFLECTION', currentStep === 8 ? 1 : 2)}>
                      {isSubmitting ? "Completing..." : (currentStep === 8 ? "Acknowledge & Appreciate (+1 Pt)" : "Complete Reflection (+2 Pts)")}
                    </PremiumButton>
                  ) : (
                    <Link href="/vault/dashboard" className={buttonVariants({ variant: "outline", size: "lg", className: "px-8" })}>
                      Return to Dashboard
                    </Link>
                  )}
                </PremiumCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
}
