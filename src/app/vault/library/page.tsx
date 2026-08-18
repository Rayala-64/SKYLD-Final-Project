import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { createClient } from "@/utils/supabase/server";
import { BookMarked, Search, Filter, Star, Clock, CheckCircle2 } from "lucide-react";

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let words: any[] = [];
  
  if (user) {
    const { data: submissions } = await supabase
      .from("submissions")
      .select(`
        id,
        date,
        points_earned,
        status,
        word_card_id,
        word_cards ( word, definition, category, difficulty )
      `)
      .eq("user_id", user.id)
      .order("date", { ascending: false });
      
    if (submissions) {
      words = submissions.map(sub => ({
        id: sub.word_card_id,
        word: (sub.word_cards as any)?.word || "Unknown",
        definition: (sub.word_cards as any)?.definition || "No definition",
        category: (sub.word_cards as any)?.category || "General",
        difficulty: (sub.word_cards as any)?.difficulty || "Medium",
        date: sub.date,
        status: sub.status === 'submitted' ? 'MASTERED' : 'LEARNING',
      }));
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground flex items-center gap-4">
              <BookMarked className="w-10 h-10 text-primary" />
              Word Vault
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Your personal library of mastered vocabulary and communication skills.
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search your vault..." 
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm focus:ring-2 focus:ring-primary focus:outline-none transition-shadow"
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border/50 bg-card/50 hover:bg-muted transition-colors">
              <Filter className="w-4 h-4" /> Filter
            </button>
          </div>
        </div>

        {/* Word Grid */}
        {words.length === 0 ? (
          <div className="text-center py-20 bg-card/30 rounded-3xl border border-dashed border-border/50">
            <BookMarked className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Your Vault is Empty</h3>
            <p className="text-muted-foreground">Complete your first daily mission to start building your library.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {words.map((w, idx) => (
              <PremiumCard key={idx} glass className="p-6 relative group overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-bold font-heading">{w.word}</h3>
                  {w.status === 'MASTERED' ? (
                    <span className="bg-green-500/10 text-green-500 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> MASTERED
                    </span>
                  ) : (
                    <span className="bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                      <Star className="w-3 h-3" /> LEARNING
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm mb-6 line-clamp-2">{w.definition}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-4 mt-auto">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(w.date).toLocaleDateString()}</span>
                  <span className="bg-primary/10 text-primary px-2 py-1 rounded-full">{w.category}</span>
                </div>
              </PremiumCard>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
