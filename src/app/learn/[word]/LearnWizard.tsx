"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Mic, Volume2, Sparkles, BookOpen, Brain, Briefcase, Lightbulb, Users, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { VideoRecorder } from "@/components/video/VideoRecorder";
import { submitDailyMissionV2, getOrCreateDailyRitual, submitRitualStep } from "@/app/actions/daily_ritual";
import { createClient } from "@/utils/supabase/client";

const steps = [
  { id: "learn", title: "Word Vault" },
  { id: "knowledge", title: "Knowledge" },
  { id: "communication", title: "Communication" },
  { id: "record", title: "Record" }
];

export function LearnWizard({ wordData, wordText }: { wordData: any, wordText: string }) {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  const [isUploading, setIsUploading] = useState(false);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      router.push("/vault/dashboard?celebrate=true");
    }
  };

  const handleVideoComplete = async (url: string) => {
    setIsUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");
      
      const ritualDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const currentRitual = await getOrCreateDailyRitual(user.id, wordData.id, ritualDate);
      
      await submitDailyMissionV2(user.id, wordData.id, "Reflection completed", url, true, currentRitual.id);
      
      handleNext();
    } catch (e) {
      console.error(e);
      alert("Failed to submit video");
    } finally {
      setIsUploading(false);
    }
  };

  const progress = ((currentStep) / (steps.length - 1)) * 100;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto min-h-[80vh] flex flex-col">
        {/* Stepper */}
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
        <div className="flex-1 flex flex-col relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              {currentStep === 0 && <VaultStep wordData={wordData} wordText={wordText} />}
              {currentStep === 1 && <KnowledgeStep wordData={wordData} />}
              {currentStep === 2 && <CommunicationStep wordData={wordData} />}
              {currentStep === 3 && <RecordStep wordData={wordData} onComplete={handleVideoComplete} isUploading={isUploading} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex justify-between items-center border-t border-border/40 pt-6 pb-12">
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
            {currentStep === steps.length - 1 ? "Complete Ritual" : "Continue"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

// STEP 1: 16-Field Word Vault View
function VaultStep({ wordData, wordText }: { wordData: any, wordText: string }) {
  if (!wordData) {
    return (
      <Card className="glass-card text-center py-20">
        <h2 className="text-4xl font-bold font-heading text-foreground capitalize">{wordText}</h2>
        <p className="text-muted-foreground mt-4">We don't have full Word Vault data for this word yet!</p>
      </Card>
    );
  }

  // Helper for JSON arrays
  const renderArray = (arr: any) => {
    if (!arr) return [];
    if (typeof arr === 'string') {
      try { return JSON.parse(arr); } catch { return []; }
    }
    return Array.isArray(arr) ? arr : [];
  };

  const synonyms = renderArray(wordData.synonyms);
  const antonyms = renderArray(wordData.antonyms);
  const collocations = renderArray(wordData.common_collocations);
  const family = renderArray(wordData.word_family);

  return (
    <div className="space-y-6">
      {/* Top Hero Card */}
      <Card className="glass-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <CardContent className="p-8 relative z-10 flex flex-col items-center text-center">
          <Button variant="outline" size="icon" className="rounded-full absolute right-6 top-6">
            <Volume2 className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="text-primary border-primary bg-primary/10">{wordData.word_type || 'Unknown'}</Badge>
            <Badge variant="secondary">{wordData.level || 'Level 1'}</Badge>
          </div>
          
          <h2 className="text-6xl font-bold font-heading text-foreground capitalize tracking-tight mb-2">{wordData.word}</h2>
          <p className="text-xl text-muted-foreground italic font-mono">{wordData.ipa_pronunciation || '/.../'}</p>
          
          <div className="bg-muted/50 p-6 rounded-2xl border border-border/50 mt-6 max-w-2xl w-full text-left">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-primary">Meaning</h3>
            </div>
            <p className="text-lg leading-relaxed">{wordData.meaning || 'No definition available.'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Grid for properties */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {synonyms.length > 0 && (
          <div className="bg-success/5 p-5 rounded-2xl border border-success/10">
            <h4 className="font-semibold text-success mb-3 flex items-center gap-2">
              <Check className="w-4 h-4" /> Synonyms
            </h4>
            <div className="flex flex-wrap gap-2">
              {synonyms.map((s: string, i: number) => <Badge key={i} variant="outline" className="bg-background">{s}</Badge>)}
            </div>
          </div>
        )}
        
        {antonyms.length > 0 && (
          <div className="bg-destructive/5 p-5 rounded-2xl border border-destructive/10">
            <h4 className="font-semibold text-destructive mb-3 flex items-center gap-2">
              <span className="font-bold">×</span> Antonyms
            </h4>
            <div className="flex flex-wrap gap-2">
              {antonyms.map((a: string, i: number) => <Badge key={i} variant="outline" className="bg-background">{a}</Badge>)}
            </div>
          </div>
        )}
      </div>

      {/* Examples Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {wordData.business_example && (
          <Card className="bg-background/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2 text-blue-500">
                <Briefcase className="w-4 h-4" /> <span className="font-semibold text-sm">Business</span>
              </div>
              <p className="text-sm">{wordData.business_example}</p>
            </CardContent>
          </Card>
        )}
        {wordData.daily_life_example && (
          <Card className="bg-background/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2 text-green-500">
                <Users className="w-4 h-4" /> <span className="font-semibold text-sm">Daily Life</span>
              </div>
              <p className="text-sm">{wordData.daily_life_example}</p>
            </CardContent>
          </Card>
        )}
        {wordData.interview_example && (
          <Card className="bg-background/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2 text-purple-500">
                <Target className="w-4 h-4" /> <span className="font-semibold text-sm">Interview</span>
              </div>
              <p className="text-sm italic">"{wordData.interview_example}"</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Memory Trick & Collocations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {wordData.memory_tip && (
          <div className="bg-amber-500/10 p-5 rounded-2xl border border-amber-500/20">
            <h4 className="font-semibold text-amber-600 mb-2 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" /> Memory Tip
            </h4>
            <p className="text-sm">{wordData.memory_tip}</p>
          </div>
        )}
        
        {collocations.length > 0 && (
          <div className="bg-indigo-500/5 p-5 rounded-2xl border border-indigo-500/10">
            <h4 className="font-semibold text-indigo-600 mb-2 flex items-center gap-2">
              <BookOpen className="w-5 h-5" /> Common Collocations
            </h4>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              {collocations.slice(0, 4).map((c: string, i: number) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// STEP 2: Knowledge Challenge
function KnowledgeStep({ wordData }: { wordData: any }) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" /> Knowledge Challenge
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 text-center space-y-6">
        <p className="text-lg text-muted-foreground">
          Without looking back at the card, try to remember the exact spelling, pronunciation, meaning, synonyms, and antonyms of <strong>{wordData?.word || "this word"}</strong>.
        </p>
        <div className="max-w-sm mx-auto space-y-4">
          <Button className="w-full" variant="outline">I remember everything</Button>
          <Button className="w-full text-destructive border-destructive" variant="outline">I need to review</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// STEP 3: Communication Challenge
function CommunicationStep({ wordData }: { wordData: any }) {
  return (
    <Card className="glass-card border-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" /> Communication Challenge
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8 text-center space-y-6">
        <p className="text-muted-foreground">Your challenge for today is:</p>
        <h3 className="text-2xl font-bold font-heading italic text-primary">
          "{wordData?.communication_challenge || 'Prepare a 30-60 second speech using the featured word in today\'s theme.'}"
        </h3>
        
        {wordData?.reflection_question && (
          <div className="bg-muted/50 p-4 rounded-xl mt-6 text-left max-w-lg mx-auto">
            <p className="text-sm font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> Reflection Question
            </p>
            <p className="text-foreground font-medium">{wordData.reflection_question}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// STEP 4: Record & Upload
function RecordStep({ wordData, onComplete, isUploading }: { wordData: any, onComplete: (url: string) => void, isUploading: boolean }) {
  return (
    <Card className="glass-card text-center py-12 border-primary/20">
      <CardContent className="space-y-8">
        <h2 className="text-3xl font-heading font-bold">Record & Upload (3 Points)</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Record your response to the Communication Challenge using the word <strong>{wordData?.word || "today's word"}</strong>.
        </p>
        
        <div className="max-w-md mx-auto">
          {isUploading ? (
             <div className="flex flex-col items-center justify-center p-12">
               <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
               <p className="text-lg font-bold">Uploading your mission...</p>
               <p className="text-sm text-muted-foreground">Assigning peer reviews...</p>
             </div>
          ) : (
             <VideoRecorder studentId="test" onUploadSuccess={onComplete} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
