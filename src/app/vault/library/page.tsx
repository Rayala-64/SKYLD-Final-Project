"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { createClient } from "@/utils/supabase/client";
import { WordCard16 } from "@/components/vault/WordCard16";
import { 
  BookMarked, Search, Filter, Star, Clock, CheckCircle2, 
  Sparkles, X, ChevronRight, BookOpen, Layers, Volume2, Globe
} from "lucide-react";

export default function LibraryPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"MY_WORDS" | "ALL_VAULT">("MY_WORDS");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWord, setSelectedWord] = useState<any | null>(null);
  
  // Data state
  const [learnedWords, setLearnedWords] = useState<any[]>([]);
  const [allVaultWords, setAllVaultWords] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    async function loadLibrary() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch all published words from Word Vault
        const { data: allWords } = await supabase
          .from("word_cards")
          .select("*")
          .order("created_at", { ascending: false });

        setAllVaultWords(allWords || []);
        const wordMap = new Map((allWords || []).map((w: any) => [w.id, w]));

        // 2. Fetch daily rituals for the logged-in student
        const { data: rituals } = await supabase
          .from("daily_rituals")
          .select("id, word_card_id, ritual_date, status, points_earned, created_at")
          .eq("student_id", user.id)
          .order("ritual_date", { ascending: false });

        if (rituals) {
          const userLearned = rituals.map((r: any) => {
            const card = wordMap.get(r.word_card_id) || {};
            return {
              ritualId: r.id,
              wordId: r.word_card_id,
              date: r.ritual_date || r.created_at,
              status: r.status === 'COMPLETED' ? 'MASTERED' : 'IN_PROGRESS',
              points: r.points_earned || 0,
              ...card
            };
          }).filter((item: any) => item.word); // filter valid

          setLearnedWords(userLearned);
        }
      } catch (err) {
        console.error("Failed to load library:", err);
      } finally {
        setLoading(false);
      }
    }

    loadLibrary();
  }, []);

  const displayList = activeTab === "MY_WORDS" ? learnedWords : allVaultWords;

  const filteredWords = displayList.filter((item: any) => {
    const query = searchQuery.toLowerCase();
    const word = (item.word || "").toLowerCase();
    const meaning = (item.meaning || item.definition || "").toLowerCase();
    const business = (item.business_example || "").toLowerCase();
    return word.includes(query) || meaning.includes(query) || business.includes(query);
  });

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border/50 pb-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground flex items-center gap-4">
              <BookMarked className="w-10 h-10 text-primary" />
              Word Vault Library
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Your personal library of mastered vocabulary and communication skills.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex bg-muted/40 p-1 rounded-2xl border border-border/50">
            <button
              onClick={() => setActiveTab("MY_WORDS")}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                activeTab === "MY_WORDS"
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Star className="w-4 h-4" /> My Mastered Words ({learnedWords.length})
            </button>
            <button
              onClick={() => setActiveTab("ALL_VAULT")}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
                activeTab === "ALL_VAULT"
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe className="w-4 h-4" /> Global Vault ({allVaultWords.length})
            </button>
          </div>
        </div>

        {/* Search & Quick Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by word, definition, or business context..." 
              className="w-full pl-10 pr-4 py-3.5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm focus:ring-2 focus:ring-primary focus:outline-none transition-shadow text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-20 bg-card/30 rounded-3xl border border-border/40">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Opening your Word Vault...</p>
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="text-center py-20 bg-card/30 rounded-3xl border border-dashed border-border/50">
            <BookMarked className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery ? "No matching words found" : "Your Vault is Empty"}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {searchQuery 
                ? "Try searching for a different keyword or view the Global Vault."
                : "Complete your daily 10-step rituals to add mastered corporate vocabulary to your vault."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredWords.map((item: any, idx: number) => {
              const meaning = item.meaning || item.definition || "No definition available.";
              const isMastered = item.status === 'MASTERED';
              
              return (
                <PremiumCard 
                  key={idx} 
                  glass 
                  onClick={() => setSelectedWord(item)}
                  className="p-6 relative group overflow-hidden cursor-pointer hover:border-primary/50 transition-all hover:scale-[1.01] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-2xl font-bold font-heading group-hover:text-primary transition-colors">
                          {item.word}
                        </h3>
                        {item.ipa_pronunciation && (
                          <span className="text-xs text-muted-foreground font-mono">
                            /{item.ipa_pronunciation}/
                          </span>
                        )}
                      </div>
                      
                      {activeTab === "MY_WORDS" ? (
                        isMastered ? (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> MASTERED
                          </span>
                        ) : (
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> IN PROGRESS
                          </span>
                        )
                      ) : (
                        <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-lg text-xs font-bold">
                          {item.word_type || "VOCAB"}
                        </span>
                      )}
                    </div>

                    <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                      {meaning}
                    </p>
                  </div>

                  <div className="border-t border-border/50 pt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      {item.level || "Foundational"}
                    </span>
                    <span className="flex items-center gap-1 text-primary font-semibold group-hover:translate-x-1 transition-transform">
                      View 16 Fields <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </PremiumCard>
              );
            })}
          </div>
        )}

        {/* 16-Field Deep Dive Modal */}
        {selectedWord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-card border border-border/60 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
              
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-border/50 pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-heading font-bold text-foreground">
                      {selectedWord.word}
                    </h2>
                    {selectedWord.ipa_pronunciation && (
                      <span className="px-3 py-1 bg-muted font-mono text-sm rounded-lg text-muted-foreground">
                        /{selectedWord.ipa_pronunciation}/
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm mt-1">
                    {selectedWord.module_name || 'Corporate Communication'} &bull; {selectedWord.word_type || 'Vocabulary'}
                  </p>
                </div>

                <button 
                  onClick={() => setSelectedWord(null)}
                  className="p-2 rounded-xl bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 16-Field Full Card Component */}
              <WordCard16 wordData={selectedWord} />

              {/* Modal Footer */}
              <div className="border-t border-border/50 pt-4 flex justify-end">
                <PremiumButton onClick={() => setSelectedWord(null)}>
                  Close Word Card
                </PremiumButton>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
