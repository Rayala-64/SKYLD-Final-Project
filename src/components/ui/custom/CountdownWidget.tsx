"use client";

import { useState, useEffect } from "react";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { Target, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";

export function CountdownWidget() {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      // Calculate next Sunday at 8 PM (20:00:00) local time
      const nextSunday = new Date(now);
      const daysUntilSunday = (7 - now.getDay()) % 7;
      
      if (daysUntilSunday === 0 && now.getHours() >= 20) {
        // If today is Sunday and it's past 8 PM, set to next Sunday
        nextSunday.setDate(now.getDate() + 7);
      } else {
        nextSunday.setDate(now.getDate() + daysUntilSunday);
      }
      
      nextSunday.setHours(20, 0, 0, 0);

      const difference = nextSunday.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          d: Math.floor(difference / (1000 * 60 * 60 * 24)),
          h: Math.floor((difference / (1000 * 60 * 60)) % 24),
          m: Math.floor((difference / 1000 / 60) % 60),
          s: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <PremiumCard glass className="p-5 flex flex-col justify-between hover:border-purple-500/40 transition-all group h-full">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <Target className="w-5 h-5" />
            </div>
            <span className="font-heading font-semibold text-base">Weekly Championship</span>
          </div>
          <span className="text-xs bg-purple-500/10 text-purple-500 px-2 py-1 rounded-md font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" /> Live Deadline
          </span>
        </div>

        <div className="py-2">
          {timeLeft ? (
            <div className="flex gap-2">
              <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-muted/40 border border-border/40 w-14">
                <span className="text-xl font-bold font-heading">{timeLeft.d}</span>
                <span className="text-[10px] text-muted-foreground uppercase">Days</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-muted/40 border border-border/40 w-14">
                <span className="text-xl font-bold font-heading">{timeLeft.h.toString().padStart(2, '0')}</span>
                <span className="text-[10px] text-muted-foreground uppercase">Hrs</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-muted/40 border border-border/40 w-14">
                <span className="text-xl font-bold font-heading">{timeLeft.m.toString().padStart(2, '0')}</span>
                <span className="text-[10px] text-muted-foreground uppercase">Min</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-500 w-14">
                <span className="text-xl font-bold font-heading animate-pulse">{timeLeft.s.toString().padStart(2, '0')}</span>
                <span className="text-[10px] opacity-80 uppercase">Sec</span>
              </div>
            </div>
          ) : (
            <div className="h-[68px] flex items-center text-sm text-muted-foreground">Calculating deadline...</div>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground leading-relaxed">
          Ensure your Pod Leader uploads the 16-minute presentation video before the deadline for Master Mentor evaluation.
        </p>
      </div>

      <div className="pt-4 mt-4 border-t border-border/30 flex items-center justify-between text-xs">
        <PremiumButton size="sm" variant="ghost" className="text-purple-500 hover:text-purple-400 p-0 h-auto" asChild>
          <Link href="/vault/championship" className="flex items-center gap-1">
            Go to Upload <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </PremiumButton>
      </div>
    </PremiumCard>
  );
}
