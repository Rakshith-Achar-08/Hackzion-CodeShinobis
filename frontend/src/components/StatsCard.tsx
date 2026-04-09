import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface StatsCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon: ReactNode;
  decimals?: number;
  delay?: number;
}

export default function StatsCard({
  label,
  value,
  prefix = "",
  suffix = "",
  icon,
  decimals = 0,
  delay = 0,
}: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const duration = 800;
    const startTime = performance.now();
    const startVal = 0;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startVal + (value - startVal) * eased);

      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };

    const timeout = setTimeout(() => {
      ref.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [value, delay]);

  const formatted =
    decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue).toLocaleString();

  return (
    <motion.div
      className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors duration-300"
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: delay / 1000 }}
    >
      <div className="flex items-center gap-2 text-[var(--color-text-secondary)]">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-2xl font-semibold tabular-nums text-[var(--color-text)]">
        {prefix}
        {formatted}
        {suffix && (
          <span className="ml-1 text-sm font-normal text-[var(--color-text-secondary)]">
            {suffix}
          </span>
        )}
      </div>
    </motion.div>
  );
}
