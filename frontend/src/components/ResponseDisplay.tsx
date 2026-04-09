import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, MessageSquare } from "lucide-react";

interface ResponseDisplayProps {
  text: string;
  onToast: (msg: string) => void;
}

export default function ResponseDisplay({ text, onToast }: ResponseDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    onToast("Response copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-colors duration-300"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-[var(--color-accent)]" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text)]">
            LLM Response
          </h3>
        </div>
        <motion.button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
          whileTap={{ scale: 0.95 }}
          aria-label="Copy response"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </motion.button>
      </div>
      <div className="max-h-80 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] p-4 transition-colors duration-300">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text)]">
          {text}
        </p>
      </div>
    </motion.div>
  );
}
