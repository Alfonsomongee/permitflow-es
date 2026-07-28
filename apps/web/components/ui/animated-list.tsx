"use client";

import { motion, Variants } from "framer-motion";
import type { ReactNode } from "react";

interface AnimatedListProps {
  children: ReactNode[];
  /** Delay entre cada elemento en segundos (default 0.08) */
  stagger?: number;
  /** Delay inicial (default 0) */
  delay?: number;
  className?: string;
}

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -16, filter: "blur(2px)" },
  visible: { opacity: 1, x: 0, filter: "blur(0px)" },
};

const containerVariants: Variants = {
  hidden: {},
  visible: (stagger: number) => ({
    transition: { staggerChildren: stagger },
  }),
};

/**
 * Envuelve una lista de elementos y los anima de forma escalonada
 * al entrar en el viewport (slideInLeft + fade).
 * Ideal para listas de trámites, resultados del clasificador, etc.
 *
 * Uso:
 * <AnimatedList>
 *   {tramites.map(t => <TramiteCard key={t.id} {...t} />)}
 * </AnimatedList>
 */
export function AnimatedList({
  children,
  stagger = 0.08,
  delay = 0,
  className,
}: AnimatedListProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      custom={stagger}
      variants={containerVariants}
      style={{ willChange: "opacity, transform" }}
    >
      {children.map((child, i) => (
        <motion.div
          key={i}
          variants={itemVariants}
          transition={{
            duration: 0.4,
            delay: delay + i * stagger,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
