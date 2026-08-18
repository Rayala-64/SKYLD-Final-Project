"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { Map, Lock, CheckCircle2, Star, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

const pathNodes = [
  { id: 1, title: "Foundations", description: "Basic communication structure and clarity.", status: "completed" },
  { id: 2, title: "Vocabulary Builder", description: "Expanding your expressive range.", status: "active" },
  { id: 3, title: "Speaking Confidence", description: "Reducing filler words and projecting certainty.", status: "locked" },
  { id: 4, title: "Deep Reflection", description: "Connecting emotional intelligence to communication.", status: "locked" },
  { id: 5, title: "Storytelling", description: "Captivating your audience with narrative arcs.", status: "locked" },
  { id: 6, title: "Professional Polish", description: "Workplace communication and active listening.", status: "locked" },
  { id: 7, title: "Master Communicator", description: "Leadership, persuasion, and dynamic presentation.", status: "locked" },
];

export default function PathPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-12 pb-20">
        
        <div className="text-center pt-8">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground flex items-center justify-center gap-4 mb-4">
            <Map className="w-10 h-10 text-primary" />
            Learning Path
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Your journey from mastering foundational vocabulary to becoming a dynamic, confident communicator.
          </p>
        </div>

        <div className="relative py-10">
          {/* Connecting Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-border/50 -translate-x-1/2 z-0" />
          
          <div className="space-y-12 relative z-10">
            {pathNodes.map((node, index) => {
              const isEven = index % 2 === 0;
              const isCompleted = node.status === "completed";
              const isActive = node.status === "active";
              const isLocked = node.status === "locked";

              return (
                <motion.div 
                  key={node.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center w-full ${isEven ? 'flex-row' : 'flex-row-reverse'}`}
                >
                  {/* Content Side */}
                  <div className={`w-1/2 ${isEven ? 'pr-12 text-right' : 'pl-12 text-left'}`}>
                    <PremiumCard 
                      glass 
                      className={`p-6 inline-block w-full max-w-md ${
                        isActive ? 'border-primary ring-1 ring-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]' : 
                        isLocked ? 'opacity-60 bg-muted/30 border-dashed border-border' : ''
                      }`}
                    >
                      <div className={`flex items-center gap-2 mb-2 ${isEven ? 'justify-end' : 'justify-start'}`}>
                        {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                        {isActive && <Star className="w-5 h-5 text-primary" />}
                        {isLocked && <Lock className="w-5 h-5 text-muted-foreground" />}
                        <h3 className={`text-xl font-bold ${isActive ? 'text-primary' : isLocked ? 'text-muted-foreground' : 'text-foreground'}`}>
                          {node.title}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground">{node.description}</p>
                      
                      {isActive && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <div className="w-full bg-muted rounded-full h-2 mb-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: '35%' }} />
                          </div>
                          <p className="text-xs text-muted-foreground text-center">35% to next milestone</p>
                        </div>
                      )}
                    </PremiumCard>
                  </div>

                  {/* Center Node */}
                  <div className="absolute left-1/2 -translate-x-1/2 flex justify-center items-center">
                    <div className={`w-12 h-12 rounded-full border-4 border-background flex items-center justify-center ${
                      isCompleted ? 'bg-green-500 text-white' : 
                      isActive ? 'bg-primary text-white shadow-[0_0_15px_rgba(var(--primary),0.5)]' : 
                      'bg-muted text-muted-foreground'
                    }`}>
                      {node.id}
                    </div>
                  </div>

                  {/* Empty Side */}
                  <div className="w-1/2" />
                </motion.div>
              );
            })}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
