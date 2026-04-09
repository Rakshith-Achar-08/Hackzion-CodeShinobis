import { useState } from "react";
import { motion } from "framer-motion";
import type { ImportanceItem } from "../lib/api";

interface HighlightedPromptProps {
  text: string;
  importance: ImportanceItem[];
  theme: "dark" | "light";
}

function getHighlightColor(score: number, theme: "dark" | "light"): string {
  if (score >= 0.7) return "#f59e0b";
  if (score >= 0.4) return "#d97706";
  return theme === "dark" ? "#64748b" : "#94a3b8";
}

function getTextColor(score: number): string {
  if (score >= 0.4) return "#000000";
  return "#ffffff";
}

export default function HighlightedPrompt({
  text,
  importance,
  theme,
}: HighlightedPromptProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!importance.length) {
    return (
      <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
        {text}
      </p>
    );
  }

  return (
    <div className="text-sm leading-[2.2]">
      {importance.map((item, idx) => {
        const bg = getHighlightColor(item.score, theme);
        const textColor = getTextColor(item.score);
        const isHovered = hoveredIdx === idx;

        return (
          <span key={idx} className="relative inline">
            <motion.span
              className="relative inline-block cursor-default rounded px-1 py-0.5 mx-[1px] transition-colors"
              style={{
                backgroundColor: bg,
                color: textColor,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: idx * 0.01 }}
              whileHover={{ scale: 1.05 }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              aria-label={`${item.word}: importance ${(item.score * 100).toFixed(0)}%`}
            >
              {item.word}
            </motion.span>

            {/* Tooltip */}
            {isHovered && (
              <motion.div
                className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-xs shadow-lg"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
              >
                <span className="text-[var(--color-text-secondary)]">Score: </span>
                <span className="font-semibold text-[var(--color-text)]">
                  {(item.score * 100).toFixed(1)}%
                </span>
              </motion.div>
            )}
          </span>
        );
      })}
    </div>
  );
}
