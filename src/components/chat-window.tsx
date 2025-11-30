"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { AssistantMessage, AgentMode } from "@/lib/types";

interface ChatWindowProps {
  messages: AssistantMessage[];
  activeMode: AgentMode;
  speaking: boolean;
  onReplay?: (message: AssistantMessage) => void;
}

export function ChatWindow({
  messages,
  activeMode,
  speaking,
  onReplay,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div className="surface-strong noise-bg relative flex h-full flex-1 flex-col overflow-hidden rounded-3xl border border-slate-700/40">
      <div className="flex items-center justify-between border-b border-slate-700/40 px-6 py-4">
        <div>
          <h2 className="text-sm uppercase tracking-[0.3em] text-slate-300">
            Conversation Stack
          </h2>
          <p className="text-sm text-slate-400">
            Mode: <span className="text-slate-200">{activeMode.name}</span>
          </p>
        </div>
        <motion.span
          animate={{ opacity: speaking ? [0.3, 1, 0.3] : 0.4 }}
          transition={{
            duration: speaking ? 1.2 : 0.2,
            repeat: speaking ? Infinity : 0,
          }}
          className={clsx(
            "rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide",
            speaking
              ? "bg-emerald-500/20 text-emerald-200"
              : "bg-slate-800 text-slate-300",
          )}
        >
          {speaking ? "Synthesizing" : "Idle"}
        </motion.span>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto px-6 py-6 pr-3"
      >
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.article
              key={message.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className={clsx(
                "max-w-2xl rounded-3xl border border-slate-700/50 p-5 shadow-lg backdrop-blur",
                message.role === "assistant"
                  ? "ml-auto bg-slate-900/60 text-slate-100"
                  : "mr-auto bg-slate-800/70 text-slate-200",
              )}
            >
              <header className="mb-3 flex items-center justify-between text-xs uppercase tracking-[0.28em] text-slate-400">
                <span>{message.role === "assistant" ? "Gemini" : "You"}</span>
                <time className="text-slate-500">
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </header>
              <p className="leading-7 text-slate-200">{message.content}</p>
              {message.audioUrl && (
                <div className="mt-3 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => onReplay?.(message)}
                    className="rounded-full border border-slate-600/50 px-3 py-1 text-xs text-slate-300 transition hover:border-slate-400"
                  >
                    Replay voice
                  </button>
                </div>
              )}
            </motion.article>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
