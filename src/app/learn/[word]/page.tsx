"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/animations/FadeIn";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Mic, Pencil, Play, Sparkles, Volume2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const steps = [
  { id: "learn", title: "Learn" },
  { id: "practice", title: "Practice" },
  { id: "reflection", title: "Reflection" },
  { id: "speaking", title: "Speaking" },
  { id: "feedback", title: "AI Feedback" },
];

export default function LearnWordPage() {
  const params = useParams();
  const word = params?.word as string || "ephemeral";
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Finished flow -> redirect to dashboard with confetti (handled in state later)
      router.push("/?celebrate=true");
    }
  };

  const progress = ((currentStep) / (steps.length - 1)) * 100;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto min-h-[80vh] flex flex-col">
        {/* Header / Stepper */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center flex-1 relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors duration-500 ${index <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <span className={`text-xs mt-2 font-medium transition-colors duration-500 hidden sm:block ${index <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>
                  {step.title}
                </span>
              </div>
            ))}
            {/* Background progress track */}
            <div className="absolute left-0 right-0 top-4 h-1 bg-muted -z-10 mx-[10%]">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col justify-center relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              {currentStep === 0 && <LearnStep word={word} />}
              {currentStep === 1 && <PracticeStep />}
              {currentStep === 2 && <ReflectionStep />}
              {currentStep === 3 && <SpeakingStep />}
              {currentStep === 4 && <FeedbackStep />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex justify-between items-center border-t border-border/40 pt-6">
          <Button 
            variant="ghost" 
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
          >
            Back
          </Button>
          <Button 
            size="lg"
            className="bg-primary hover:bg-primary/90 min-w-[120px]"
            onClick={handleNext}
          >
            {currentStep === steps.length - 1 ? "Complete" : "Continue"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Sub-components for each step
function LearnStep({ word }: { word: string }) {
  return (
    <Card className="glass-card overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
      <CardContent className="p-10 relative z-10 text-center space-y-6">
        <Button variant="outline" size="icon" className="rounded-full absolute right-6 top-6">
          <Volume2 className="w-5 h-5" />
        </Button>
        <h2 className="text-6xl font-bold font-heading text-foreground capitalize">{word}</h2>
        <p className="text-xl text-muted-foreground italic">/ɪˈfem.ər.əl/</p>
        
        <div className="py-6 space-y-4">
          <div className="bg-muted/50 p-6 rounded-2xl border border-border/50">
            <h3 className="font-semibold text-primary mb-2">Meaning</h3>
            <p className="text-lg">Lasting for a very short time.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-success/5 p-4 rounded-xl border border-success/10 text-left">
              <h4 className="text-sm font-semibold text-success mb-1">Synonyms</h4>
              <p className="text-foreground">transient, fleeting, momentary</p>
            </div>
            <div className="bg-destructive/5 p-4 rounded-xl border border-destructive/10 text-left">
              <h4 className="text-sm font-semibold text-destructive mb-1">Antonyms</h4>
              <p className="text-foreground">permanent, enduring, eternal</p>
            </div>
          </div>
        </div>

        <div className="bg-card/80 p-4 rounded-xl text-left flex items-start gap-3 border border-border">
          <Sparkles className="w-6 h-6 text-yellow-500 shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold text-sm">Memory Trick</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Think of a mayfly, which only lives for one day. Its life is truly ephemeral.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PracticeStep() {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Fill in the blank</CardTitle>
      </CardHeader>
      <CardContent className="p-8 text-center space-y-8">
        <p className="text-2xl leading-relaxed">
          The beauty of the sunset is <span className="inline-block w-32 border-b-2 border-primary/50 text-transparent mx-2">ephemeral</span>, lasting only a few moments before the sky turns dark.
        </p>
        
        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mt-8">
          {["eternal", "ephemeral", "tangible", "obscure"].map((opt, i) => (
            <Button key={opt} variant={i === 1 ? "default" : "outline"} className={`h-16 text-lg rounded-xl ${i === 1 ? 'bg-success hover:bg-success/90 ring-4 ring-success/20 text-success-foreground' : ''}`}>
              {opt}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReflectionStep() {
  return (
    <Card className="glass-card border-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Pencil className="w-6 h-6 text-primary" /> Reflection
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <p className="mb-4 text-muted-foreground">
          Write a short paragraph using the word <strong>ephemeral</strong>. Relate it to your own life or a recent experience.
        </p>
        <div className="relative">
          <textarea 
            className="w-full h-48 bg-background/50 border border-border rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-lg"
            placeholder="Start writing here..."
            defaultValue="I realized how ephemeral my time at college was when I started my final semester. The late-night study sessions and early morning classes felt like they would last forever, but they were actually just a fleeting moment."
          />
          <div className="absolute bottom-4 right-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary" /> AI Assistant Active
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SpeakingStep() {
  return (
    <Card className="glass-card text-center py-12">
      <CardContent className="space-y-8">
        <h2 className="text-3xl font-heading font-bold">Time to Speak!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Read your reflection out loud. We'll analyze your fluency and pronunciation.
        </p>
        
        <div className="relative w-48 h-48 mx-auto">
          {/* Animated rings */}
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-2 border-4 border-primary/40 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
          
          <button className="absolute inset-4 bg-gradient-to-br from-primary to-secondary rounded-full flex flex-col items-center justify-center text-white shadow-xl hover:scale-105 transition-transform group">
            <Mic className="w-12 h-12 mb-2 group-hover:scale-110 transition-transform" />
            <span className="font-semibold">Hold to Record</span>
          </button>
        </div>
        
        <div className="h-8 flex items-center justify-center gap-1">
          {/* Fake waveform */}
          {[1,2,3,4,5,4,3,4,5,6,5,4,3,2,1].map((h, i) => (
            <motion.div 
              key={i}
              className="w-1 bg-primary/50 rounded-full"
              animate={{ height: [8, h * 6, 8] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.1 }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FeedbackStep() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 text-success mb-2">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-heading font-bold">Great Job!</h2>
        <p className="text-muted-foreground">Here's your AI feedback for today.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Grammar", score: 92, color: "text-blue-500" },
          { label: "Vocabulary", score: 88, color: "text-purple-500" },
          { label: "Fluency", score: 85, color: "text-emerald-500" },
          { label: "Confidence", score: 95, color: "text-amber-500" },
        ].map((stat) => (
          <Card key={stat.label} className="glass-card">
            <CardContent className="p-4 text-center">
              <div className={`text-3xl font-bold font-heading mb-1 ${stat.color}`}>{stat.score}</div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">AI Suggestions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {[
              "Excellent use of the target word 'ephemeral' in context.",
              "Your pronunciation was clear, but pause slightly longer between sentences.",
              "Consider varying your sentence length for better flow."
            ].map((suggestion, i) => (
              <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                <Check className="w-5 h-5 text-success shrink-0 mt-0.5" />
                <span className="text-sm">{suggestion}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
