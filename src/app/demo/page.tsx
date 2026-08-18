"use client";

import { ProgressRing } from "@/components/ui/custom/ProgressRing";
import { StreakCounter } from "@/components/animations/StreakCounter";
import { AnimatedNumber } from "@/components/animations/AnimatedNumber";
import { triggerConfetti } from "@/lib/confetti";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function DemoPage() {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center space-y-12 py-12">
        <h1 className="text-4xl font-heading font-bold text-glow-primary">Phase 1 Components Demo</h1>
        
        <div className="flex gap-12 items-center">
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-xl font-bold">Progress Ring (Glow)</h2>
            <ProgressRing progress={75} size={150} strokeWidth={12} color="var(--primary)">
              <span className="text-3xl font-bold">75%</span>
            </ProgressRing>
          </div>

          <div className="flex flex-col items-center gap-4">
            <h2 className="text-xl font-bold">Streak Counter</h2>
            <StreakCounter streak={42} />
          </div>

          <div className="flex flex-col items-center gap-4">
            <h2 className="text-xl font-bold">Animated Number</h2>
            <div className="text-4xl font-bold text-primary">
              <AnimatedNumber value={8450} /> XP
            </div>
          </div>
        </div>

        <div className="pt-8">
          <PremiumButton onClick={triggerConfetti}>
            Trigger Confetti
          </PremiumButton>
        </div>
      </div>
    </DashboardLayout>
  );
}
