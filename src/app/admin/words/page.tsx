"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { Loader2, Wand2, Save, ArrowLeft, RefreshCw, CheckCircle, Upload, Sparkles, Database } from "lucide-react";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { generateAIWordAction, bulkSeed100CorporateWords } from "@/app/actions/admin";
import { createClient } from "@/utils/supabase/client";

function WordEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBulkSeeding, setIsBulkSeeding] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Base fields
  const [word, setWord] = useState("");
  const [wordType, setWordType] = useState("");
  const [status, setStatus] = useState("draft");
  const [activeDate, setActiveDate] = useState("");
  
  // AI fields
  const [formData, setFormData] = useState<any>({
    ipa_pronunciation: "",
    meaning: "",
    synonyms: [],
    antonyms: [],
    word_family: [],
    common_collocations: [],
    business_example: "",
    daily_life_example: "",
    interview_example: "",
    related_concepts: [],
    common_mistakes: [],
    memory_tip: "",
    reflection_question: "",
    communication_challenge: ""
  });

  const loadWord = async (id: string) => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("word_cards").select("*").eq("id", id).single();
    if (data) {
      setWord(data.word || "");
      setWordType(data.word_type || "");
      setStatus(data.status || "draft");
      setActiveDate(data.active_date || "");
      setFormData({
        ipa_pronunciation: data.ipa_pronunciation || "",
        meaning: data.meaning || "",
        synonyms: data.synonyms || [],
        antonyms: data.antonyms || [],
        word_family: data.word_family || [],
        common_collocations: data.common_collocations || [],
        business_example: data.business_example || "",
        daily_life_example: data.daily_life_example || "",
        interview_example: data.interview_example || "",
        related_concepts: data.related_concepts || [],
        common_mistakes: data.common_mistakes || [],
        memory_tip: data.memory_tip || "",
        reflection_question: data.reflection_question || "",
        communication_challenge: data.communication_challenge || ""
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (editId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadWord(editId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const handleGenerateAll = async () => {
    if (!word) return alert("Please enter a word first.");
    setIsGenerating(true);
    try {
      const res = await generateAIWordAction(word, wordType);
      if (res.success && res.data) {
        setFormData(res.data);
      }
    } catch (e: any) {
      alert("Failed to generate: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateField = async (field: string) => {
    if (!word) return alert("Please enter a word first.");
    try {
      // In a real app, you'd show a specific loading state for this field
      const res = await generateAIWordAction(word, wordType, field as any, formData);
      if (res.success && res.data) {
        setFormData((prev: any) => ({ ...prev, [field]: (res.data as any)[field] }));
      }
    } catch (e: any) {
      alert("Failed to regenerate field: " + e.message);
    }
  };

  const handleBulkSeed = async () => {
    setIsBulkSeeding(true);
    try {
      const res = await bulkSeed100CorporateWords(false);
      if (res.alreadySeeded) {
        alert(`✅ Word Vault is already fully populated with ${res.count} enterprise corporate words!\n\nThe 100-Day Semester Curriculum is active and locked. No changes were made.`);
      } else {
        alert(`🎉 Success! Populated ${res.count} words with all 16 rich pedagogical fields into the Word Vault!`);
      }
      router.push('/admin/dashboard');
    } catch (e: any) {
      alert("Failed to bulk seed: " + e.message);
    } finally {
      setIsBulkSeeding(false);
    }
  };

  const handleSave = async (newStatus: string) => {
    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        word,
        word_type: wordType,
        status: newStatus,
        active_date: activeDate || new Date().toISOString().split('T')[0], // Fallback to today if not provided to prevent not-null error
        ...formData,
        definition: formData.meaning || formData.definition || "Pending definition...",
        example_sentence: formData.daily_life_example || formData.example_sentence || "Pending example..."
      };

      if (editId) {
        await supabase.from("word_cards").update(payload).eq("id", editId);
      } else {
        const { data, error } = await supabase.from("word_cards").insert([payload]).select().single();
        if (error) {
          if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('word_cards_word_key')) {
            const { data: existing } = await supabase.from("word_cards").select("id").eq("word", word).single();
            if (existing) {
              await supabase.from("word_cards").update(payload).eq("id", existing.id);
              router.replace(`/admin/words?id=${existing.id}`);
              setStatus(newStatus);
              alert(`Updated existing word "${word}" successfully!`);
              return;
            }
          }
          throw error;
        }
        // Redirect to edit mode
        if (data) {
          router.replace(`/admin/words?id=${data.id}`);
        }
      }
      setStatus(newStatus);
      alert("Saved successfully!");
    } catch (e: any) {
      alert("Failed to save: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const renderField = (label: string, field: string, isArray = false, isComplexArray = false) => {
    return (
      <div className="mb-6 p-4 bg-muted/20 border border-border/50 rounded-xl">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-bold text-primary">{label}</label>
          <button 
            type="button"
            onClick={() => handleRegenerateField(field)}
            className="text-xs flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Regenerate
          </button>
        </div>
        
        {isArray && !isComplexArray ? (
          <input 
            type="text" 
            value={(formData[field] || []).join(", ")}
            onChange={(e) => setFormData({...formData, [field]: e.target.value.split(",").map((s: string) => s.trim())})}
            className="w-full bg-background border border-border/50 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
            placeholder="Comma separated values"
          />
        ) : isComplexArray ? (
          <textarea 
            value={JSON.stringify(formData[field] || [], null, 2)}
            onChange={(e) => {
              try {
                setFormData({...formData, [field]: JSON.parse(e.target.value)});
              } catch (e) {
                // Ignore parse errors while typing
              }
            }}
            className="w-full bg-background border border-border/50 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none font-mono min-h-[100px]"
            placeholder="JSON format"
          />
        ) : (
          <textarea 
            value={formData[field] || ""}
            onChange={(e) => setFormData({...formData, [field]: e.target.value})}
            className="w-full bg-background border border-border/50 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none min-h-[80px]"
          />
        )}
      </div>
    );
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-24">
        
        <div className="flex items-center gap-4 border-b border-border/50 pb-6">
          <button onClick={() => router.push('/admin/dashboard')} className="p-2 bg-muted rounded-full hover:bg-muted/80">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold font-heading">{editId ? "Edit Word Card" : "New Word Card"}</h1>
            <p className="text-muted-foreground mt-1">Status: <span className="uppercase font-bold text-primary">{status}</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="md:col-span-1 space-y-6">
            <PremiumCard className="p-6">
              <h2 className="text-lg font-bold mb-4 border-b border-border/50 pb-2">Core Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Target Word</label>
                  <input 
                    type="text" 
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    className="w-full bg-muted/50 border border-border/50 rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none font-bold text-lg"
                    placeholder="e.g. Ubiquitous"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Word Type</label>
                  <input 
                    type="text" 
                    value={wordType}
                    onChange={(e) => setWordType(e.target.value)}
                    className="w-full bg-muted/50 border border-border/50 rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none"
                    placeholder="e.g. Adjective"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Active Date (Optional)</label>
                  <input 
                    type="date" 
                    value={activeDate}
                    onChange={(e) => setActiveDate(e.target.value)}
                    className="w-full bg-muted/50 border border-border/50 rounded-lg p-3 focus:ring-2 focus:ring-primary/50 outline-none"
                  />
                </div>
                
                <PremiumButton 
                  onClick={handleGenerateAll} 
                  disabled={isGenerating || !word} 
                  className="w-full mt-4"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                  {isGenerating ? "AI is writing..." : "Generate 15 Fields via AI"}
                </PremiumButton>
              </div>
            </PremiumCard>

            <PremiumCard className="p-6 space-y-4">
              <h2 className="text-lg font-bold mb-2 border-b border-border/50 pb-2">Actions</h2>
              
              <button 
                onClick={() => handleSave("draft")}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-muted hover:bg-muted/80 border border-border/50 rounded-xl transition-colors font-medium text-sm"
              >
                <Save className="w-4 h-4" /> Save as Draft
              </button>
              
              <button 
                onClick={() => handleSave("review")}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 border border-orange-500/20 rounded-xl transition-colors font-medium text-sm"
              >
                <CheckCircle className="w-4 h-4" /> Submit for Review
              </button>
              
              <button 
                onClick={() => handleSave("published")}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl transition-colors font-medium text-sm"
              >
                <Upload className="w-4 h-4" /> Approve & Publish
              </button>
            </PremiumCard>

            <PremiumCard className="p-6 space-y-4 border-l-4 border-l-primary bg-primary/5">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold">100-Day Semester Vault</h2>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Automatically seed 100 enterprise corporate vocabulary words across 3 levels with all 16 rich pedagogical fields directly into your vault.
              </p>
              <button 
                onClick={handleBulkSeed}
                disabled={isBulkSeeding}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-all font-bold text-sm shadow-lg shadow-primary/20"
              >
                {isBulkSeeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {isBulkSeeding ? "Seeding 100 Words..." : "🚀 AI Bulk Seed 100 Words"}
              </button>
            </PremiumCard>
          </div>

          <div className="md:col-span-2 space-y-6">
            <PremiumCard className="p-6">
              <h2 className="text-lg font-bold mb-6 border-b border-border/50 pb-2 flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" /> AI Generated Content
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField("IPA Pronunciation", "ipa_pronunciation")}
                {renderField("Meaning", "meaning")}
                {renderField("Synonyms", "synonyms", true)}
                {renderField("Antonyms", "antonyms", true)}
                {renderField("Word Family", "word_family", true)}
                {renderField("Common Collocations", "common_collocations", true)}
              </div>
              
              <h3 className="text-md font-bold mt-8 mb-4 border-b border-border/50 pb-2">Examples & Usage</h3>
              {renderField("Business Example", "business_example")}
              {renderField("Daily Life Example", "daily_life_example")}
              {renderField("Interview Example", "interview_example")}
              
              <h3 className="text-md font-bold mt-8 mb-4 border-b border-border/50 pb-2">Learning & Reflection</h3>
              {renderField("Related Concepts", "related_concepts", true)}
              {renderField("Common Mistakes (JSON)", "common_mistakes", true, true)}
              {renderField("Memory Tip", "memory_tip")}
              {renderField("Reflection Question", "reflection_question")}
              {renderField("Communication Challenge", "communication_challenge")}
            </PremiumCard>
          </div>
          
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function WordEditorPage() {
  return (
    <Suspense fallback={<div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <WordEditorContent />
    </Suspense>
  );
}
