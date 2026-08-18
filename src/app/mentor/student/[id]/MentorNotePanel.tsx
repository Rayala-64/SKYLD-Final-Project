"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveMentorNote } from "@/app/actions/mentor";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Flag, CheckCircle2 } from "lucide-react";

export function MentorNotePanel({ studentId, initialNote, initialFlagged }: { studentId: string, initialNote: string, initialFlagged: boolean }) {
  const [note, setNote] = useState(initialNote || "");
  const [flagged, setFlagged] = useState(initialFlagged || false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      await saveMentorNote(studentId, note, flagged);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PremiumCard glass gradientBorder className={`p-6 ${flagged ? 'border-warning/50 bg-warning/5' : 'border-border/50'}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Private Notes
        </h3>
        <button
          onClick={() => setFlagged(!flagged)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
            flagged ? 'bg-warning/20 text-warning border border-warning/50' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
          {flagged ? "Flagged for review" : "Flag student"}
        </button>
      </div>

      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add private observations about this student's progress..."
        className="min-h-[150px] resize-y bg-background/50 border-border/50 focus-visible:ring-primary/50 mb-4"
      />

      <div className="flex justify-end items-center gap-3">
        {saved && (
          <span className="text-success text-sm flex items-center gap-1 animate-in fade-in slide-in-from-right-4">
            <CheckCircle2 className="w-4 h-4" /> Saved
          </span>
        )}
        <PremiumButton onClick={handleSave} disabled={isSaving || (note === initialNote && flagged === initialFlagged)} className="px-6">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Note
        </PremiumButton>
      </div>
    </PremiumCard>
  );
}
