"use client";

import { useState } from "react";
import { Flame, Check } from "lucide-react";
import { sendBuddyNudge } from "@/app/actions/notifications";

interface NudgeBuddyButtonProps {
  buddyId: string;
  buddyName: string;
}

export function NudgeBuddyButton({ buddyId, buddyName }: NudgeBuddyButtonProps) {
  const [nudged, setNudged] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNudge = async () => {
    if (nudged || loading) return;
    setLoading(true);
    try {
      await sendBuddyNudge(buddyId);
      setNudged(true);
      setTimeout(() => setNudged(false), 5000);
    } catch (err) {
      console.error("Nudge failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleNudge}
      disabled={loading || nudged}
      title={`Send friendly reminder to ${buddyName}`}
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
        nudged
          ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
          : "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 border border-indigo-500/20 hover:border-indigo-500/40"
      }`}
    >
      {nudged ? (
        <>
          <Check className="w-3 h-3" /> Nudged!
        </>
      ) : (
        <>
          <Flame className="w-3 h-3 text-warning" /> Nudge Buddy
        </>
      )}
    </button>
  );
}
