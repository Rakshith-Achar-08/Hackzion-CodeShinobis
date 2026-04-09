import { motion } from "framer-motion";

export default function LoadingSkeleton() {
  const shimmer =
    "relative overflow-hidden before:absolute before:inset-0 before:animate-pulse before:bg-[var(--color-border)]";

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Stats skeleton */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
          >
            <div className={`mb-3 h-3 w-24 rounded ${shimmer}`} />
            <div className={`h-7 w-16 rounded ${shimmer}`} />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
        >
          <div className={`mb-4 h-4 w-40 rounded ${shimmer}`} />
          <div className="space-y-2">
            <div className={`h-3 w-full rounded ${shimmer}`} />
            <div className={`h-3 w-5/6 rounded ${shimmer}`} />
            <div className={`h-3 w-4/6 rounded ${shimmer}`} />
          </div>
        </div>
      ))}
    </motion.div>
  );
}
