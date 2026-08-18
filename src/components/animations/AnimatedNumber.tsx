"use client";

import { useEffect, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

export function AnimatedNumber({ value }: { value: number }) {
  const [hasMounted, setHasMounted] = useState(false);
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => Math.round(current));

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (hasMounted) {
      spring.set(value);
    }
  }, [spring, value, hasMounted]);

  if (!hasMounted) return <span>{value}</span>;

  return <motion.span>{display}</motion.span>;
}
