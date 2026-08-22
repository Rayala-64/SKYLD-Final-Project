"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { ArrowLeft, Timer, BrainCircuit, Trophy, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";

// Dummy quiz data for demo purposes
const quizQuestions = [
  { question: "What is the synonym for 'Ubiquitous'?", options: ["Rare", "Everywhere", "Specific", "Hidden"], answer: 1 },
  { question: "Which word means 'to mitigate or lessen'?", options: ["Exacerbate", "Ameliorate", "Alleviate", "Prolong"], answer: 2 },
  { question: "Select the correct spelling:", options: ["Acquiesce", "Aqueisce", "Acquiece", "Aqueice"], answer: 0 },
  { question: "Which is an antonym for 'Ephemeral'?", options: ["Transient", "Permanent", "Fleeting", "Short-lived"], answer: 1 },
  { question: "Choose the correct collocation: 'He made a _____ decision.'", options: ["Swift", "Fastly", "Quickly", "Speed"], answer: 0 },
];

export default function Round1Challenge() {
  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const handleStart = () => setStarted(true);

  const handleAnswer = (idx: number) => {
    setSelectedAnswer(idx);
    
    if (idx === quizQuestions[currentQuestion].answer) {
      setScore(s => s + 10);
    }

    setTimeout(() => {
      setSelectedAnswer(null);
      if (currentQuestion < quizQuestions.length - 1) {
        setCurrentQuestion(c => c + 1);
      } else {
        setCompleted(true);
      }
    }, 1000);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto pb-12">
        <Link href="/vault/championship" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Championship Hub
        </Link>

        {!started && !completed ? (
          <PremiumCard className="p-12 text-center glass-card">
            <BrainCircuit className="w-20 h-20 text-indigo-500 mx-auto mb-6" />
            <h1 className="text-4xl font-bold font-heading mb-4">Round 1: Master Challenge</h1>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-8">
              A rapid-fire quiz testing your individual mastery over this month's 150 vocabulary words. You have 15 minutes. Good luck.
            </p>
            <PremiumButton size="lg" className="px-12 text-lg" onClick={handleStart}>
              Start Challenge
            </PremiumButton>
          </PremiumCard>
        ) : completed ? (
          <PremiumCard className="p-12 text-center glass-card border-t-8 border-t-primary">
            <Trophy className="w-24 h-24 text-primary mx-auto mb-6" />
            <h1 className="text-4xl font-bold font-heading mb-2">Challenge Complete!</h1>
            <p className="text-xl text-muted-foreground mb-8">You scored <strong className="text-foreground">{score}</strong> points.</p>
            <div className="bg-primary/10 border border-primary/20 p-6 rounded-2xl max-w-md mx-auto mb-8">
              <h3 className="font-bold mb-2">Round 2 Qualification Status</h3>
              <p className="text-sm">Your score has been submitted to your Pod's total aggregate. Await the final standings to see if your Pod advances to the Grand Presentation.</p>
            </div>
            <Link href="/vault/championship">
              <PremiumButton>Return to Hub</PremiumButton>
            </Link>
          </PremiumCard>
        ) : (
          <div className="space-y-8">
            <div className="flex justify-between items-center bg-background/50 p-4 rounded-xl border border-border/50">
              <div className="flex items-center gap-2 font-bold text-lg">
                <Timer className="w-5 h-5 text-warning" /> 14:59
              </div>
              <div className="font-bold">
                Question {currentQuestion + 1} / {quizQuestions.length}
              </div>
            </div>

            <Progress value={(currentQuestion / quizQuestions.length) * 100} className="h-2" />

            <PremiumCard className="p-8 md:p-12 glass-card">
              <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">{quizQuestions[currentQuestion].question}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quizQuestions[currentQuestion].options.map((opt, idx) => {
                  let btnClass = "text-lg py-8 justify-start px-6";
                  if (selectedAnswer !== null) {
                    if (idx === quizQuestions[currentQuestion].answer) {
                      btnClass += " bg-success text-success-foreground border-success hover:bg-success";
                    } else if (idx === selectedAnswer) {
                      btnClass += " bg-destructive text-destructive-foreground border-destructive hover:bg-destructive";
                    } else {
                      btnClass += " opacity-50";
                    }
                  }

                  return (
                    <PremiumButton 
                      key={idx} 
                      variant="outline" 
                      className={btnClass}
                      onClick={() => selectedAnswer === null && handleAnswer(idx)}
                      disabled={selectedAnswer !== null}
                    >
                      {selectedAnswer !== null && idx === quizQuestions[currentQuestion].answer && <CheckCircle2 className="w-5 h-5 mr-3" />}
                      {selectedAnswer !== null && idx === selectedAnswer && idx !== quizQuestions[currentQuestion].answer && <XCircle className="w-5 h-5 mr-3" />}
                      {opt}
                    </PremiumButton>
                  );
                })}
              </div>
            </PremiumCard>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
