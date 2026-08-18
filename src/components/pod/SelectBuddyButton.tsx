"use client";

import { useState } from "react";
import { UserPlus, CheckCircle2, Loader2 } from "lucide-react";
import { setStudyBuddy } from "@/app/actions/pod";

import { useRouter } from "next/navigation";

export function SelectBuddyButton({ buddyId }: { buddyId: string }) {
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleSelect = async () => {
    setIsPending(true);
    try {
      await setStudyBuddy(buddyId);
      setIsSuccess(true);
      // Optional: reload the page or optimistically update
      router.push('/vault/dashboard');
    } catch (err) {
      console.error(err);
      alert("Failed to select buddy. Please try again.");
      setIsPending(false);
    }
  };

  if (isSuccess) {
    return (
      <button className="text-success p-1.5 rounded-md bg-success/10" disabled>
        <CheckCircle2 className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button 
      onClick={handleSelect} 
      disabled={isPending}
      className="text-muted-foreground hover:text-primary hover:bg-primary/10 p-1.5 rounded-md transition-colors"
      title="Select as Study Buddy"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
    </button>
  );
}
