import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { BookOpen, Mic, CheckCircle, XCircle, Users, Link as LinkIcon, Briefcase, Clock, UserCheck, Lightbulb, AlertTriangle, Brain, HelpCircle, MessageSquare } from "lucide-react";

export function WordCard16({ wordData }: { wordData: any }) {
  if (!wordData) return null;

  const renderSection = (title: string, icon: React.ReactNode, content: React.ReactNode, className: string = "") => (
    <div className={`p-4 bg-muted/20 border border-border/50 rounded-xl flex flex-col h-full ${className}`}>
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
      </div>
      <div className="flex-1 text-sm">{content}</div>
    </div>
  );

  const renderList = (items: string[]) => {
    if (!items || items.length === 0) return <span className="text-muted-foreground italic">None</span>;
    return (
      <ul className="list-disc pl-4 space-y-1">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    );
  };

  const renderMistakes = (mistakes: any[]) => {
    if (!mistakes || mistakes.length === 0) return <span className="text-muted-foreground italic">None</span>;
    return (
      <div className="space-y-2">
        {mistakes.map((m, i) => (
          <div key={i} className="text-xs p-2 bg-background rounded-lg border border-border/50">
            <div className="text-destructive font-medium flex items-center gap-1"><XCircle className="w-3 h-3"/> {m.mistake}</div>
            <div className="text-green-500 font-medium flex items-center gap-1 mt-1"><CheckCircle className="w-3 h-3"/> {m.correction}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full text-left">
      <div className="flex items-center justify-between mb-4">
        <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-bold uppercase tracking-wider">
          {wordData.module_name || 'Module 1'} - {wordData.level || 'Level 1 Foundational Vocabulary'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Core */}
        {renderSection("1. Word", <BookOpen className="w-4 h-4 text-primary" />, 
          <span className="text-3xl font-bold font-heading text-glow-primary">{wordData.word}</span>
        )}
        
        {renderSection("2. IPA Pronunciation", <Mic className="w-4 h-4 text-secondary" />, 
          <span className="text-xl font-mono text-muted-foreground">{wordData.ipa_pronunciation || '/.../'}</span>
        )}

        {renderSection("3. Word Type", <BookOpen className="w-4 h-4 text-blue-500" />, 
          <span className="text-lg font-medium">{wordData.word_type || 'Unknown'}</span>
        )}

        {renderSection("4. Meaning", <Lightbulb className="w-4 h-4 text-yellow-500" />, 
          <span className="text-lg font-medium">{wordData.meaning || wordData.definition}</span>
        )}

        {/* Vocabulary */}
        {renderSection("5. Synonyms", <CheckCircle className="w-4 h-4 text-green-500" />, renderList(wordData.synonyms))}
        {renderSection("6. Antonyms", <XCircle className="w-4 h-4 text-destructive" />, renderList(wordData.antonyms))}
        
        {renderSection("7. Word Family", <Users className="w-4 h-4 text-purple-500" />, renderList(wordData.word_family))}
        {renderSection("8. Common Collocations", <LinkIcon className="w-4 h-4 text-orange-500" />, renderList(wordData.common_collocations))}

        {/* Usage */}
        {renderSection("9. Business Example", <Briefcase className="w-4 h-4 text-blue-400" />, 
          <span className="italic">"{wordData.business_example}"</span>
        )}
        
        {renderSection("10. Daily Life Example", <Clock className="w-4 h-4 text-green-400" />, 
          <span className="italic">"{wordData.daily_life_example || wordData.example_sentence}"</span>
        )}

        {renderSection("11. Interview Example", <UserCheck className="w-4 h-4 text-indigo-400" />, 
          <span className="italic">"{wordData.interview_example}"</span>
        )}

        {renderSection("12. Related Concept", <Lightbulb className="w-4 h-4 text-yellow-400" />, renderList(wordData.related_concepts))}

        {/* Learning & Dev */}
        {renderSection("13. Common Mistakes", <AlertTriangle className="w-4 h-4 text-red-500" />, renderMistakes(wordData.common_mistakes))}
        
        {renderSection("14. Memory Tip", <Brain className="w-4 h-4 text-pink-500" />, 
          <span>{wordData.memory_tip}</span>
        )}

        {renderSection("15. Reflection Question", <HelpCircle className="w-4 h-4 text-teal-500" />, 
          <span className="font-medium text-primary">{wordData.reflection_question}</span>
        )}

        {renderSection("16. Communication Challenge", <MessageSquare className="w-4 h-4 text-indigo-500" />, 
          <span className="font-medium text-secondary">{wordData.communication_challenge}</span>
        )}

      </div>
    </div>
  );
}
