"use client";

import { motion } from "framer-motion";

export const StaggerContainer = ({
  children,
  className = "",
  delayChildren = 0.1,
  staggerChildren = 0.05,
}: {
  children: React.ReactNode;
  className?: string;
  delayChildren?: number;
  staggerChildren?: number;
}) => {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren,
            staggerChildren,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: {
            ease: [0.25, 0.25, 0, 1],
            duration: 0.5
          }
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
