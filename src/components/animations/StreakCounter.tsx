"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { AnimatedNumber } from "./AnimatedNumber";

export function StreakCounter({ streak }: { streak: number }) {
  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border-orange-500/20 bg-orange-500/10 text-orange-500 font-bold"
    >
      <motion.div
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 10, -10, 0]
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity,
          repeatType: "reverse"
        }}
      >
        <Flame className="w-5 h-5 fill-orange-500" />
      </motion.div>
      <AnimatedNumber value={streak} />
    </motion.div>
  );
}
