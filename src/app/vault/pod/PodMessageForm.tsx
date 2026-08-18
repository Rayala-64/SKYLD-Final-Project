"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendPodMessage } from "@/app/actions/pod";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";

export function PodMessageForm() {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      await sendPodMessage(message);
      setMessage("");
      router.refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Share a thought, ask a question, or encourage your pod..."
        className="min-h-[60px] resize-none border-primary/20 focus-visible:ring-primary/50"
        disabled={isSubmitting}
      />
      <PremiumButton 
        type="submit" 
        disabled={!message.trim() || isSubmitting}
        className="h-auto shrink-0 px-6 rounded-xl"
      >
        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
      </PremiumButton>
    </form>
  );
}
