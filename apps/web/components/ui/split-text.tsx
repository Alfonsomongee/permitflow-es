"use client";

import { motion, Variants } from "framer-motion";

interface SplitTextProps {
  text: string;
  className?: string;
  /** Delay entre cada palabra en segundos (default 0.06) */
  stagger?: number;
  /** Delay inicial antes de empezar (default 0) */
  delay?: number;
  /** Elemento HTML a renderizar (default 'span') */
  as?: keyof JSX.IntrinsicElements;
}

const wordVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

/**
 * Anima la entrada del texto palabra a palabra con stagger.
 * Combina traducción vertical + desenfoque → enfoque.
 * Compatible con Server Components: usa "use client" sólo aquí.
 */
export function SplitText({
  text,
  className,
  stagger = 0.06,
  delay = 0,
  as: Tag = "span",
}: SplitTextProps) {
  const words = text.split(" ");

  return (
    <Tag className={className} aria-label={text}>
      <motion.span
        initial="hidden"
        animate="visible"
        transition={{ staggerChildren: stagger, delayChildren: delay }}
        style={{ display: "inline" }}
      >
        {words.map((word, i) => (
          <motion.span
            key={i}
            variants={wordVariants}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: "inline-block", marginRight: "0.25em" }}
          >
            {word}
          </motion.span>
        ))}
      </motion.span>
    </Tag>
  );
}
