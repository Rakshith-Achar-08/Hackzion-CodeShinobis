import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ArrowRight, Scissors } from "lucide-react";
import type { TrimmedResult, ImportanceItem } from "../lib/api";
import HighlightedPrompt from "./HighlightedPrompt";

interface TrimmedPromptProps {
  originalText: string;
  importance: ImportanceItem[];
  trimmed: TrimmedResult;
  theme: "dark" | "light";
  onUseTrimmed: (prompt: string) => void;
  onToast: (msg: string) => void;
}

export default function TrimmedPrompt({
  originalText,
  importance,
  trimmed,
  theme,
  onUseTrimmed,
  onToast,
}: TrimmedPromptProps) {
  const [copied, setCopied] = useState(false);
  const reduction = trimmed.original_token_count - trimmed.trimmed_token_count;
  const reductionPct =
    trimmed.original_token_count > 0
      ? ((reduction / trimmed.original_token_count) * 100).toFixed(1)
      : "0";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(trimmed.trimmed_prompt);
    setCopied(true);
    onToast("Trimmed prompt copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-colors duration-300"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      {/* Header */}
      <div className="mb-5 flex items-center gap-2">
        <Scissors size={16} className="text-[var(--color-accent)]" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text)]">
          Suggested Trimmed Prompt
        </h3>
      </div>

      {/* Stats bar */}
      <div className="mb-5 flex flex-wrap gap-4 text-xs text-[var(--color-text-secondary)]">
        <span>
          Tokens:{" "}
          <span className="font-semibold text-[var(--color-text)]">
            {trimmed.original_token_count}
          </span>
          <ArrowRight size={12} className="mx-1 inline" />
          <span className="font-semibold text-[var(--color-accent)]">
            {trimmed.trimmed_token_count}
          </span>
        </span>
        <span>
          Reduced:{" "}
          <span className="font-semibold text-[var(--color-accent)]">
            {reduction} tokens ({reductionPct}%)
          </span>
        </span>
        <span>
          Savings:{" "}
          <span className="font-semibold text-[var(--color-accent)]">
            ${trimmed.savings.toFixed(6)}
          </span>
        </span>
      </div>

      {/* Side by side */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Original */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
            Original
          </p>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-colors duration-300">
            <HighlightedPrompt
              text={originalText}
              importance={importance}
              theme={theme}
            />
          </div>
        </div>

        {/* Trimmed */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]">
            Trimmed
          </p>
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-colors duration-300">
            <p className="text-sm leading-relaxed text-[var(--color-text)]">
              {trimmed.trimmed_prompt}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-wrap gap-3">
        <motion.button
          onClick={handleCopy}
          className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2 text-xs font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          whileTap={{ scale: 0.95 }}
          aria-label="Copy trimmed prompt"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied!" : "Copy Trimmed Prompt"}
        </motion.button>

        <motion.button
          onClick={() => onUseTrimmed(trimmed.trimmed_prompt)}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          whileTap={{ scale: 0.95 }}
          aria-label="Use this trimmed prompt"
        >
          <ArrowRight size={14} />
          Use This Prompt
        </motion.button>
      </div>
    </motion.div>
  );
}
