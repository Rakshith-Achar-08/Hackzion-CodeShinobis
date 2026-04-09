import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  Key,
  ChevronDown,
  Hash,
  MessageSquare,
  DollarSign,
  Sparkles,
  AlertCircle,
} from "lucide-react";

import Header from "./components/Header";
import StatsCard from "./components/StatsCard";
import HighlightedPrompt from "./components/HighlightedPrompt";
import ResponseDisplay from "./components/ResponseDisplay";
import TrimmedPrompt from "./components/TrimmedPrompt";
import LoadingSkeleton from "./components/LoadingSkeleton";
import Toast from "./components/Toast";
import { analyzePrompt, type AnalyzeResponse } from "./lib/api";

const EXAMPLE_PROMPT =
  "You are an expert software architect. Please provide a comprehensive, detailed analysis of the advantages and disadvantages of using microservices architecture versus a traditional monolithic architecture for a large-scale e-commerce platform. Include performance considerations, deployment strategies, team organization implications, and specific technology recommendations for each approach.";

const MODELS = [
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
];

type ToastItem = {
  id: number;
  message: string;
  type: "success" | "error" | "info";
};

export default function App() {
  // Theme
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("ts-theme") as "dark" | "light") || "dark";
    }
    return "dark";
  });

  // Form state
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gpt-3.5-turbo");
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ts-api-key") || "";
    }
    return "";
  });
  const [showKey, setShowKey] = useState(false);

  // Results
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // History
  const [history, setHistory] = useState<
    { prompt: string; model: string; result: AnalyzeResponse }[]
  >([]);

  // Toast
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  let toastId = 0;

  const addToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "success") => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    []
  );

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Theme persistence
  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem("ts-theme", theme);
  }, [theme]);

  // API key persistence
  useEffect(() => {
    localStorage.setItem("ts-api-key", apiKey);
  }, [apiKey]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  // Submit handler
  const handleAnalyze = async () => {
    if (!prompt.trim()) {
      addToast("Please enter a prompt.", "error");
      return;
    }
    if (!apiKey.trim()) {
      addToast("Please enter your OpenAI API key.", "error");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await analyzePrompt(prompt, model, apiKey);
      setResult(data);
      setHistory((prev) => [{ prompt, model, result: data }, ...prev].slice(0, 3));
      addToast("Analysis complete!", "success");
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Something went wrong.";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleAnalyze();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prompt, apiKey, model]);

  const handleUseTrimmed = (trimmedText: string) => {
    setPrompt(trimmedText);
    setResult(null);
    addToast("Trimmed prompt loaded into editor.", "info");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isMac =
    typeof navigator !== "undefined" &&
    navigator.platform.toUpperCase().indexOf("MAC") >= 0;

  return (
    <div className="min-h-screen transition-colors duration-300">
      <Header theme={theme} onToggleTheme={toggleTheme} />

      <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Input section */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* API Key + Model row */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            {/* API Key */}
            <div className="flex-1">
              <label
                htmlFor="api-key"
                className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]"
              >
                <Key size={12} />
                OpenAI API Key
              </label>
              <input
                id="api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 text-sm text-[var(--color-text)] placeholder-[var(--color-text-secondary)] transition-colors focus:border-[var(--color-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                aria-label="OpenAI API Key"
              />
            </div>

            {/* Model selector */}
            <div className="sm:w-48">
              <label
                htmlFor="model-select"
                className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[var(--color-text-secondary)]"
              >
                <Sparkles size={12} />
                Model
              </label>
              <div className="relative">
                <select
                  id="model-select"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2.5 pr-8 text-sm text-[var(--color-text)] transition-colors focus:border-[var(--color-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                  aria-label="Select model"
                >
                  {MODELS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]"
                />
              </div>
            </div>
          </div>

          {/* Prompt textarea */}
          <div className="relative">
            <textarea
              id="prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt here..."
              rows={6}
              className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4 text-sm leading-relaxed text-[var(--color-text)] placeholder-[var(--color-text-secondary)] transition-colors focus:border-[var(--color-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              aria-label="Prompt input"
            />
          </div>

          {/* Action row */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <motion.button
              onClick={handleAnalyze}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              whileTap={{ scale: 0.95 }}
              aria-label="Analyze prompt"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Thinking…
                </>
              ) : (
                <>
                  <Send size={16} />
                  Analyze Prompt
                </>
              )}
            </motion.button>

            <motion.button
              onClick={() => {
                setPrompt(EXAMPLE_PROMPT);
                addToast("Example prompt loaded.", "info");
              }}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              whileTap={{ scale: 0.95 }}
              aria-label="Try with example prompt"
            >
              Try with example prompt
            </motion.button>

            <span className="hidden text-xs text-[var(--color-text-secondary)] sm:inline">
              {isMac ? "⌘" : "Ctrl"} + Enter to analyze
            </span>
          </div>
        </motion.section>

        {/* Error state */}
        <AnimatePresence>
          {error && !loading && (
            <motion.div
              className="mb-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <AlertCircle size={18} className="shrink-0 text-red-400" />
              <p className="text-sm text-red-300">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading skeleton */}
        {loading && <LoadingSkeleton />}

        {/* Results */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Stats cards */}
              <div className="grid gap-4 sm:grid-cols-3">
                <StatsCard
                  label="Prompt Tokens"
                  value={result.prompt_tokens}
                  icon={<Hash size={14} />}
                  delay={0}
                />
                <StatsCard
                  label="Response Tokens"
                  value={result.response_tokens}
                  icon={<MessageSquare size={14} />}
                  delay={100}
                />
                <StatsCard
                  label="Total Cost"
                  value={result.cost.total_cost}
                  prefix="$"
                  decimals={6}
                  icon={<DollarSign size={14} />}
                  delay={200}
                />
              </div>

              {/* Highlighted prompt */}
              <motion.div
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-colors duration-300"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles size={16} className="text-[var(--color-accent)]" />
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text)]">
                    Token Importance Map
                  </h3>
                </div>
                <div className="mb-3 flex flex-wrap gap-3 text-xs text-[var(--color-text-secondary)]">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-3 w-3 rounded"
                      style={{ backgroundColor: "#f59e0b" }}
                    />
                    High ≥ 70%
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-3 w-3 rounded"
                      style={{ backgroundColor: "#d97706" }}
                    />
                    Medium 40–69%
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block h-3 w-3 rounded"
                      style={{ backgroundColor: theme === "dark" ? "#64748b" : "#94a3b8" }}
                    />
                    Low &lt; 40%
                  </span>
                </div>
                <HighlightedPrompt
                  text={prompt}
                  importance={result.importance}
                  theme={theme}
                />
              </motion.div>

              {/* LLM Response */}
              <ResponseDisplay
                text={result.response_text}
                onToast={(msg) => addToast(msg)}
              />

              {/* Trimmed prompt */}
              <TrimmedPrompt
                originalText={prompt}
                importance={result.importance}
                trimmed={result.trimmed}
                theme={theme}
                onUseTrimmed={handleUseTrimmed}
                onToast={(msg) => addToast(msg)}
              />

              {/* History */}
              {history.length > 1 && (
                <motion.div
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-colors duration-300"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text)]">
                    Recent Analyses
                  </h3>
                  <div className="space-y-2">
                    {history.slice(0, 3).map((entry, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setPrompt(entry.prompt);
                          setModel(entry.model);
                          setResult(entry.result);
                        }}
                        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-left text-sm transition-colors hover:border-[var(--color-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                        aria-label={`Load analysis ${i + 1}`}
                      >
                        <p className="truncate text-[var(--color-text)]">
                          {entry.prompt.slice(0, 80)}
                          {entry.prompt.length > 80 ? "…" : ""}
                        </p>
                        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                          {entry.result.total_tokens} tokens · $
                          {entry.result.cost.total_cost.toFixed(6)} ·{" "}
                          {MODELS.find((m) => m.value === entry.model)?.label}
                        </p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] py-6 text-center text-xs text-[var(--color-text-secondary)] transition-colors duration-300">
        TokenScope — Prompt token analysis & optimization
      </footer>

      {/* Toasts */}
      {toasts.map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          type={t.type}
          onDismiss={() => removeToast(t.id)}
        />
      ))}
    </div>
  );
}
