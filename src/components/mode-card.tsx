"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import clsx from "clsx";
import type { AgentMode } from "@/lib/types";

interface ModeCardProps {
  mode: AgentMode;
  active: boolean;
  onSelect: (mode: AgentMode) => void;
}

export function ModeCard({ mode, active, onSelect }: ModeCardProps) {
  const gradient = `bg-gradient-to-br ${mode.glow ?? "from-sky-400 via-indigo-500 to-purple-500"}`;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onSelect(mode)}
      className={clsx(
        "relative flex flex-col gap-3 rounded-3xl p-5 transition-all",
        "surface hover:border-slate-500/30 focus-visible:outline-none",
      )}
      style={{
        borderColor: active ? mode.primaryColor : undefined,
        boxShadow: active
          ? `0 0 0 1px ${mode.primaryColor}33, 0 32px 80px -32px ${mode.primaryColor}44`
          : undefined,
      }}
      data-active={active}
    >
      <div
        className={clsx(
          "glow-ring flex h-12 w-12 items-center justify-center rounded-2xl",
          gradient,
        )}
        data-active={active}
      >
        <Sparkles className="h-6 w-6 text-slate-950" strokeWidth={1.5} />
      </div>

      <div className="space-y-2 text-left">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-100">{mode.name}</h3>
          {active && (
            <motion.span
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs uppercase tracking-[0.2em] text-slate-300"
            >
              Active
            </motion.span>
          )}
        </div>
        <p className="text-sm text-slate-300">{mode.description}</p>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        {mode.capabilities.map((capability) => (
          <span
            key={capability}
            className="rounded-full border border-slate-500/40 bg-slate-800/60 px-3 py-1 text-[11px] uppercase tracking-wider text-slate-300"
          >
            {capability}
          </span>
        ))}
      </div>
    </motion.button>
  );
}
