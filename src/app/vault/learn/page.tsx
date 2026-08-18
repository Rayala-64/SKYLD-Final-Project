"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import type { ReflectionFeedback, SpeechFeedback } from "@/app/actions/gemini";
import { evaluateBadges, submitDailyMission } from "@/app/actions/student";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, PenTool, Mic, Sparkles, CheckCircle2, ArrowLeft, ArrowRight, Loader2, Target, Lightbulb } from "lucide-react";
import { ProgressRing } from "@/components/ui/custom/ProgressRing";
import { VideoRecorder } from "@/components/video/VideoRecorder";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { triggerConfetti } from "@/lib/confetti";
import { AnimatedNumber } from "@/components/animations/AnimatedNumber";

export default function LearnPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  
  const [studentId, setStudentId] = useState<string | null>(null);
  const [podId, setPodId] = useState<string | null>(null);
  const [wordData, setWordData] = useState<any>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [applySentence, setApplySentence] = useState("");
  const [reflection, setReflection] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  
  const [aiFeedback, setAiFeedback] = useState<ReflectionFeedback | null>(null);
  const [videoFeedback, setVideoFeedback] = useState<SpeechFeedback | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setStudentId(user.id);
        const { data: profile } = await supabase.from("users").select("pod_id").eq("id", user.id).single();
        if (profile) setPodId(profile.pod_id);
      }

      // Fetch word of the day
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const { data: word } = await supabase.from("word_cards").select("*").eq("active_date", today).single();
      
      if (!word) {
        // No mission today.
        setWordData(null);
        setIsLoading(false);
        return;
      }

      if (word) {
        setWordData(word);
        
        // Check if user has already submitted this word
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: existingSub } = await supabase
            .from("submissions")
            .select("id, reflection_ai_feedback, video_ai_feedback")
            .eq("user_id", user.id)
            .eq("word_card_id", word.id)
            .maybeSingle();
          if (existingSub) {
            if (existingSub.reflection_ai_feedback) setAiFeedback(existingSub.reflection_ai_feedback as any);
            if (existingSub.video_ai_feedback) setVideoFeedback(existingSub.video_ai_feedback as any);
            setStep(6); // Skip to completion screen if already done
          }
        }
      } else {
        setWordData(null);
      }
      setIsLoading(false);
    }
    loadData();
  }, [supabase]);

  // Poll for AI feedback when on step 6 and feedback is pending
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 6 && studentId && wordData && (!aiFeedback || (!videoFeedback && videoUrl))) {
      interval = setInterval(async () => {
        const { data: sub } = await supabase
          .from("submissions")
          .select("reflection_ai_feedback, video_ai_feedback")
          .eq("user_id", studentId)
          .eq("word_card_id", wordData.id)
          .maybeSingle();
          
        if (sub) {
          if (sub.reflection_ai_feedback) setAiFeedback(sub.reflection_ai_feedback as any);
          if (sub.video_ai_feedback) setVideoFeedback(sub.video_ai_feedback as any);
          
          if (sub.reflection_ai_feedback && (sub.video_ai_feedback || !videoUrl)) {
            clearInterval(interval);
          }
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [step, studentId, wordData, aiFeedback, videoFeedback, videoUrl, supabase]);

  const handleNext = async () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2 && quizAnswer) {
      setStep(3); // Go to apply
    } else if (step === 3 && applySentence.length >= 5) {
      setStep(4); // Go to reflect
    } else if (step === 4 && reflection.length >= 10 && studentId && wordData) {
      // We no longer call analyzeReflection here! It's done via background queue.
      setStep(5);
    } else if (step === 5 && videoUrl && studentId && wordData) {
      setIsSubmitting(true);
      try {
        // We no longer call analyzeSpeech here!
        // Save complete submission to database using secure server action
        const isCorrect = wordData?.activity?.questions?.[0] 
          ? quizAnswer === wordData.activity.questions[0].correctAnswer
          : (quizAnswer === wordData.meaning || quizAnswer === wordData.definition);

        const fullText = `Sentence: ${applySentence}\nReflection: ${reflection}`;

        await submitDailyMission(
          studentId,
          wordData.id,
          fullText, 
          videoUrl,
          isCorrect
        );

        await evaluateBadges();

        triggerConfetti();
        setStep(6);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const totalSteps = 6;
  const stepProgress = (step / totalSteps) * 100;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!wordData) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-6">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-4">
            <BookOpen className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold font-heading">No Mission Available</h2>
          <p className="text-muted-foreground">
            There is no daily mission assigned for today. Please check back later or contact your mentor.
          </p>
          <Link href="/vault/dashboard" className={buttonVariants({ variant: "default" })}>
            Return to Dashboard
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // Use real quiz options from the database, or fallback options if none exist
  const fallbackOptions = wordData ? [
    wordData.definition || wordData.meaning,
    "A rare type of mineral found in deep caves",
    "To quickly run away from danger",
    "The process of creating something new"
  ].sort(() => Math.random() - 0.5) : [];

  const quizOptions = wordData?.activity?.questions?.[0]?.options || fallbackOptions;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-12">
        <Link href="/vault/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Link>

        {/* Progress Header */}
        <div className="flex items-center justify-between mb-8 bg-card/50 backdrop-blur-sm p-4 rounded-2xl border border-border/50 shadow-sm">
          <div className="flex items-center gap-4">
            <ProgressRing progress={stepProgress} size={60} strokeWidth={4} />
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Daily Mission</p>
              <h2 className="text-lg font-bold">Word of the Day</h2>
            </div>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div 
                key={s}
                className={`w-8 h-2 rounded-full transition-all duration-500 ${
                  s <= step ? 'bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="relative min-h-[500px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <PremiumCard className="p-8 md:p-12 border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-xl glass-card">
                  <div className="flex items-center gap-3 text-primary mb-6">
                    <BookOpen className="w-6 h-6 drop-shadow-md" />
                    <span className="font-semibold uppercase tracking-wider text-sm drop-shadow-sm">Step 1: Discover</span>
                  </div>
                  
                  <div className="text-center py-12">
                    <h1 className="text-5xl md:text-7xl font-bold font-heading mb-6 tracking-tight text-glow-primary">
                      {wordData?.word}
                    </h1>
                    <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-8">
                      {wordData?.definition || wordData?.meaning}
                    </p>
                    <div className="inline-block bg-muted/50 p-6 rounded-2xl border border-border/50 italic text-lg text-foreground/80 shadow-inner">
                      "{wordData?.example || wordData?.example_sentence}"
                    </div>
                  </div>
                  
                  <PremiumButton onClick={handleNext} className="w-full text-lg h-14 rounded-xl shadow-lg shadow-primary/20">
                    I Understand <ArrowRight className="w-5 h-5 ml-2" />
                  </PremiumButton>
                </PremiumCard>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <PremiumCard className="p-8 md:p-12 shadow-xl glass-card">
                  <div className="flex items-center gap-3 text-blue-500 mb-6">
                    <Target className="w-6 h-6 drop-shadow-md" />
                    <span className="font-semibold uppercase tracking-wider text-sm drop-shadow-sm">Step 2: Practice</span>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="text-center">
                      <h2 className="text-3xl font-bold font-heading mb-2">
                        {wordData?.activity?.questions?.[0]?.text || "What does it mean?"}
                      </h2>
                      {!wordData?.activity?.questions?.[0] && (
                        <p className="text-muted-foreground text-lg">Select the correct definition for <span className="font-bold text-glow-primary">{wordData?.word}</span></p>
                      )}
                    </div>
                    
                    <div className="space-y-4 max-w-2xl mx-auto">
                      {(wordData?.activity?.questions?.[0]?.options || quizOptions).map((opt: string, idx: number) => (
                        <motion.button
                          key={idx}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setQuizAnswer(opt)}
                          className={`w-full p-6 text-left rounded-2xl border-2 transition-all ${
                            quizAnswer === opt 
                              ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary),0.3)]' 
                              : 'border-border/50 hover:border-primary/50 bg-card hover:bg-muted/50'
                          }`}
                        >
                          <span className="text-lg font-medium">{opt}</span>
                        </motion.button>
                      ))}
                    </div>
                    
                    <PremiumButton 
                      onClick={handleNext} 
                      className="w-full text-lg h-14 rounded-xl shadow-lg mt-8"
                      disabled={!quizAnswer}
                    >
                      Continue <ArrowRight className="w-5 h-5 ml-2" />
                    </PremiumButton>
                  </div>
                </PremiumCard>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <PremiumCard className="p-8 md:p-12 shadow-xl glass-card">
                  <div className="flex items-center gap-3 text-amber-500 mb-6">
                    <Lightbulb className="w-6 h-6 drop-shadow-md" />
                    <span className="font-semibold uppercase tracking-wider text-sm drop-shadow-sm">Step 3: Apply</span>
                  </div>
                  
                  <div className="space-y-6">
                    <h2 className="text-3xl font-bold font-heading">Use the word in a sentence</h2>
                    <p className="text-muted-foreground text-lg">
                      Create your own original sentence using the word <strong className="text-glow-primary">{wordData?.word.toLowerCase()}</strong>.
                    </p>
                    
                    <Textarea 
                      placeholder={`Type your sentence here...`}
                      className="min-h-[100px] text-lg p-6 rounded-2xl resize-none bg-background/50 focus:bg-background transition-colors border-primary/20 focus-visible:ring-primary/50 shadow-inner"
                      value={applySentence}
                      onChange={(e) => setApplySentence(e.target.value)}
                    />
                    
                    <div className="flex justify-between items-center mt-6">
                      <span className={`text-sm font-medium ${applySentence.length < 5 ? 'text-destructive' : 'text-green-500'}`}>
                        {applySentence.length > 0 ? "Great start!" : "Waiting for your sentence..."}
                      </span>
                      <PremiumButton 
                        size="lg" 
                        onClick={handleNext} 
                        disabled={applySentence.length < 5}
                        className="shadow-secondary/20 shadow-lg"
                      >
                        Continue <ArrowRight className="w-5 h-5 ml-2" />
                      </PremiumButton>
                    </div>
                  </div>
                </PremiumCard>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <PremiumCard className="p-8 md:p-12 shadow-xl glass-card">
                  <div className="flex items-center gap-3 text-secondary mb-6">
                    <PenTool className="w-6 h-6 drop-shadow-md" />
                    <span className="font-semibold uppercase tracking-wider text-sm drop-shadow-sm">Step 4: Reflect</span>
                  </div>
                  
                  <div className="space-y-6">
                    <h2 className="text-3xl font-bold font-heading">Write a short reflection</h2>
                    <p className="text-muted-foreground text-lg">
                      Think of a time when something felt <strong className="text-glow-primary">{wordData?.word.toLowerCase()}</strong>. Describe the situation.
                    </p>
                    
                    <Textarea 
                      placeholder={`Think of a time when something felt ${wordData?.word.toLowerCase()}...`}
                      className="min-h-[200px] text-lg p-6 rounded-2xl resize-none bg-background/50 focus:bg-background transition-colors border-primary/20 focus-visible:ring-primary/50 shadow-inner"
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                    />
                    
                    <div className="flex justify-between items-center">
                      <span className={`text-sm font-medium ${reflection.length < 10 ? 'text-destructive' : 'text-green-500'}`}>
                        {reflection.length} characters (min 10)
                      </span>
                      <PremiumButton 
                        size="lg" 
                        onClick={handleNext} 
                        disabled={reflection.length < 10 || isSubmitting}
                        className="shadow-secondary/20 shadow-lg"
                      >
                        {isSubmitting ? "Analyzing..." : "Submit to AI Coach"} <Sparkles className="w-4 h-4 ml-2" />
                      </PremiumButton>
                    </div>
                  </div>
                </PremiumCard>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <PremiumCard className="p-8 md:p-12 shadow-xl glass-card">
                  <div className="flex items-center gap-3 text-primary mb-6">
                    <Mic className="w-6 h-6 drop-shadow-md" />
                    <span className="font-semibold uppercase tracking-wider text-sm drop-shadow-sm">Step 5: Speak</span>
                  </div>
                  
                  <div className="space-y-6">
                    <h2 className="text-3xl font-bold font-heading">Record your speech</h2>
                    <p className="text-muted-foreground text-lg">
                      Record a 1-minute video using the word <strong className="text-glow-primary">{wordData?.word}</strong> in a sentence. This builds speaking confidence.
                    </p>
                    
                    <div className="p-1 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20">
                      <VideoRecorder 
                        studentId={studentId || "anonymous"} 
                        onUploadSuccess={(url) => setVideoUrl(url)} 
                      />
                    </div>
                    
                    {videoUrl && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 border border-green-500/30 bg-green-500/10 rounded-xl flex items-center gap-3 text-green-500 shadow-sm"
                      >
                        <CheckCircle2 className="w-6 h-6 drop-shadow-sm" />
                        <span className="text-sm font-bold">Video uploaded successfully!</span>
                      </motion.div>
                    )}
                    
                    <PremiumButton 
                      onClick={handleNext} 
                      className="w-full mt-6 h-14 text-lg shadow-primary/30 shadow-xl"
                      disabled={!videoUrl || isSubmitting}
                    >
                      {isSubmitting ? "Saving to Vault..." : "Complete Mission"} <ArrowRight className="w-5 h-5 ml-2" />
                    </PremiumButton>
                  </div>
                </PremiumCard>
              </motion.div>
            )}

            {step === 6 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
              >
                <PremiumCard className="p-8 md:p-12 text-center bg-gradient-to-b from-card to-primary/5 shadow-2xl glass-card border-primary/20">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="w-24 h-24 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.4)]"
                  >
                    <CheckCircle2 className="w-12 h-12" />
                  </motion.div>
                  
                  <h2 className="text-4xl md:text-5xl font-bold font-heading mb-4 text-glow-primary">Mission Complete!</h2>
                  
                  <div className="flex justify-center mb-8">
                    <div className="bg-primary/10 border border-primary/30 px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_15px_rgba(var(--primary),0.2)]">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <span className="text-xl font-bold text-primary">
                        +<AnimatedNumber value={50} /> XP Earned
                      </span>
                    </div>
                  </div>

                  <p className="text-muted-foreground text-lg mb-10 max-w-md mx-auto">
                    You've successfully learned, applied, reflected on, and practiced the word <strong className="text-foreground">{wordData?.word}</strong>. Your submission is now in the Vault.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mb-12">
                    <div className="p-6 bg-card rounded-2xl border border-border/50 shadow-md relative overflow-hidden group hover:border-secondary/50 transition-colors">
                      <div className="absolute top-0 left-0 w-1 h-full bg-secondary group-hover:shadow-[0_0_10px_rgba(var(--secondary),0.8)] transition-all" />
                      <h3 className="font-bold mb-3 flex items-center gap-2">
                        <PenTool className="w-5 h-5 text-secondary" /> AI Coach: Reflection
                      </h3>
                      {aiFeedback ? (
                        <>
                          <div className="text-4xl font-bold text-secondary mb-3 drop-shadow-sm">{aiFeedback.score}/10</div>
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">Strengths:</strong> {aiFeedback.strengths?.[0] || 'Good effort.'}</p>
                            <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">To Improve:</strong> {aiFeedback.improvement_suggestions?.[0] || 'Keep practicing.'}</p>
                            <div className="p-3 bg-muted/50 rounded-lg text-sm italic border border-border/50">
                              {aiFeedback.improved_version}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-6">
                          <p className="text-sm text-muted-foreground">AI Evaluation Pending.</p>
                          <p className="text-xs text-muted-foreground">A mentor will review your reflection shortly.</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6 bg-card rounded-2xl border border-border/50 shadow-md relative overflow-hidden group hover:border-primary/50 transition-colors">
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary group-hover:shadow-[0_0_10px_rgba(var(--primary),0.8)] transition-all" />
                      <h3 className="font-bold mb-3 flex items-center gap-2">
                        <Mic className="w-5 h-5 text-primary" /> AI Coach: Speech
                      </h3>
                      {videoFeedback ? (
                        <>
                          <div className="text-4xl font-bold text-primary mb-3 drop-shadow-sm">{videoFeedback.fluency}% <span className="text-sm font-normal text-muted-foreground">Fluency</span></div>
                          <div className="space-y-3">
                            <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">Clarity:</strong> {videoFeedback.clarity}%</p>
                            <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">Feedback:</strong> {videoFeedback.suggestion}</p>
                            <div className="p-3 bg-primary/5 rounded-lg text-sm text-primary font-medium border border-primary/20">
                              Confidence: {videoFeedback.confidence_indicators}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-6">
                          <p className="text-sm text-muted-foreground">AI Analysis Pending.</p>
                          <p className="text-xs text-muted-foreground">A mentor will review your pronunciation shortly.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <PremiumButton size="lg" className="rounded-full px-12 h-14 text-lg shadow-[0_0_20px_rgba(var(--primary),0.4)]" asChild>
                    <Link href="/vault/dashboard">Return to Vault</Link>
                  </PremiumButton>
                </PremiumCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
}
