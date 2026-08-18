"use client";

import { useState } from "react";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { CheckCircle2, Loader2 } from "lucide-react";
import { markSubmissionReviewed } from "@/app/actions/mentor";

export function MarkReviewedButton({ 
  submissionId, 
  studentId 
}: { 
  submissionId: string;
  studentId: string;
}) {
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleReview = async () => {
    setIsPending(true);
    try {
      await markSubmissionReviewed(submissionId, studentId);
      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      alert("Failed to mark as reviewed. Please try again.");
      setIsPending(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex items-center gap-2 text-success bg-success/10 px-3 py-1.5 rounded-full text-sm font-bold border border-success/20">
        <CheckCircle2 className="w-4 h-4" />
        Reviewed
      </div>
    );
  }

  return (
    <PremiumButton 
      size="sm" 
      onClick={handleReview} 
      disabled={isPending}
      className="gap-2"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <CheckCircle2 className="w-4 h-4" />
      )}
      Mark as Reviewed
    </PremiumButton>
  );
}
