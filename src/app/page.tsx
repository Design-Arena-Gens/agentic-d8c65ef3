"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpCircle,
  Loader2,
  MessageSquare,
  Volume2,
  VolumeX,
} from "lucide-react";
import { v4 as uuid } from "uuid";
import { defaultModes } from "@/lib/modes";
import type {
  AgentMode,
  AssistantMessage,
  ConnectorBlueprint,
  VoiceCaptureResult,
} from "@/lib/types";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { ModeCard } from "@/components/mode-card";
import { VoiceRecorder } from "@/components/voice-recorder";
import { ChatWindow } from "@/components/chat-window";
import { ModeDesigner } from "@/components/mode-designer";
import { IntegrationPanel } from "@/components/integration-panel";

type GeminiResponse = {
  message: string;
  audioBase64?: string;
  citations?: string[];
};

export default function Home() {
  const [customModes, setCustomModes, customModesReady] = useLocalStorage<AgentMode[]>(
    "agentic.customModes.v1",
    [],
  );
  const [connectors, setConnectors, connectorsReady] = useLocalStorage<
    ConnectorBlueprint[]
  >("agentic.connectors.v1", []);
  const [modeConnectorMap, setModeConnectorMap] = useLocalStorage<
    Record<string, string[]>
  >("agentic.modeConnectorMap.v1", {});
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedModeId, setSelectedModeId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [designerDraft, setDesignerDraft] = useState<AgentMode | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const baseModes = useMemo(
    () => [...defaultModes, ...customModes],
    [customModes],
  );

  const modes = useMemo<AgentMode[]>(
    () =>
      baseModes.map((mode) => ({
        ...mode,
        connectorIds: modeConnectorMap[mode.id] ?? mode.connectorIds ?? [],
      })),
    [baseModes, modeConnectorMap],
  );

  const activeMode = useMemo<AgentMode>(() => {
    const fallback = modes[0] ?? defaultModes[0];
    if (!selectedModeId) return fallback;
    return modes.find((mode) => mode.id === selectedModeId) ?? fallback;
  }, [modes, selectedModeId]);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!selectedModeId && modes.length > 0) {
      setSelectedModeId(modes[0].id);
    }
  }, [modes, selectedModeId]);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 1;
      utterance.rate = 1;
      if (activeMode.voicePersona?.toLowerCase().includes("calm")) {
        utterance.rate = 0.95;
      }
      if (activeMode.voicePersona?.toLowerCase().includes("dynamic")) {
        utterance.rate = 1.12;
        utterance.pitch = 1.1;
      }
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    [activeMode.voicePersona],
  );

  const handleReplay = useCallback(
    (message: AssistantMessage) => {
      speak(message.content);
    },
    [speak],
  );

  const persistCustomMode = (mode: AgentMode) => {
    setCustomModes((prev) => [...prev, mode]);
    setModeConnectorMap((prev) => ({
      ...prev,
      [mode.id]: [],
    }));
    setSelectedModeId(mode.id);
    setDesignerDraft(null);
  };

  const attachConnector = (modeId: string, connectorId: string) => {
    setModeConnectorMap((prev) => {
      const existing = prev[modeId] ?? [];
      const alreadyAssigned = existing.includes(connectorId);
      const next = alreadyAssigned
        ? existing.filter((id) => id !== connectorId)
        : [...existing, connectorId];
      return { ...prev, [modeId]: next };
    });
  };

  const appendMessage = useCallback(
    (message: AssistantMessage) => {
      setMessages((prev) => [...prev, message]);
    },
    [setMessages],
  );

  const requestGemini = async ({
    text,
    audio,
  }: {
    text?: string;
    audio?: VoiceCaptureResult;
  }) => {
    const connectorContext =
      activeMode.connectorIds
        ?.map((id) => connectors.find((connector) => connector.id === id))
        .filter(Boolean) ?? [];

    const response = await fetch("/api/gemini", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: activeMode,
        inputText: text ?? null,
        audio,
        history: messages.slice(-12),
        connectors: connectorContext,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error ?? "Gemini request failed");
    }

    return (await response.json()) as GeminiResponse;
  };

  const handleSend = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!input.trim() || isStreaming) return;
    const text = input.trim();
    setInput("");
    await sendInteraction({ text });
  };

  const sendInteraction = async ({
    text,
    audio,
  }: {
    text?: string;
    audio?: VoiceCaptureResult;
  }) => {
    const content = text ?? "🎤 Voice prompt";
    const userMessage: AssistantMessage = {
      id: uuid(),
      modeId: activeMode.id,
      role: "user",
      content,
      createdAt: Date.now(),
      audioUrl: audio?.blobUrl,
    };
    appendMessage(userMessage);
    setIsStreaming(true);

    try {
      const payload = await requestGemini({ text, audio });
      const assistantMessage: AssistantMessage = {
        id: uuid(),
        modeId: activeMode.id,
        role: "assistant",
        content: payload.message,
        createdAt: Date.now(),
      };
      appendMessage(assistantMessage);
      if (autoSpeak) {
        speak(payload.message);
      }
    } catch (error) {
      console.error(error);
      appendMessage({
        id: uuid(),
        modeId: activeMode.id,
        role: "assistant",
        content:
          "I hit turbulence synthesizing that request. Refine the prompt or check your Gemini API key.",
        createdAt: Date.now(),
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleVoiceCapture = async (capture: VoiceCaptureResult) => {
    await sendInteraction({ audio: capture });
  };

  const registerConnector = (connector: ConnectorBlueprint) => {
    setConnectors((prev) => [...prev, connector]);
  };

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-8 px-6 py-10 pb-20 lg:flex-row lg:px-12 lg:py-16">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-gradient-to-br from-sky-500/20 via-purple-500/20 to-emerald-400/20 blur-[140px]" />
      </div>

      <section className="flex w-full flex-col gap-6 lg:max-w-sm">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface noise-bg rounded-3xl border border-slate-700/40 p-6"
        >
          <span className="text-xs uppercase tracking-[0.4em] text-slate-400">
            Gemini Live Control Room
          </span>
          <h1 className="mt-3 text-3xl font-semibold text-slate-100 md:text-4xl">
            Orchestrate agentic voice experiences that evolve in real time.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Select a mode, speak or type, wire new connectors, and let the
            assistant recompose its design language instantly.
          </p>
        </motion.header>

        <div className="grid gap-4">
          {modes.map((mode) => (
            <ModeCard
              key={mode.id}
              mode={mode}
              active={activeMode.id === mode.id}
              onSelect={(selected) => setSelectedModeId(selected.id)}
            />
          ))}
        </div>

        <ModeDesigner
          onCreate={persistCustomMode}
          onDraft={(draft) => setDesignerDraft(draft)}
        />

        {designerDraft && (
          <motion.div
            layout
            className="surface rounded-3xl border border-slate-700/50 p-5"
          >
            <h3 className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Blueprint Preview
            </h3>
            <p className="mt-3 text-lg font-semibold text-slate-100">
              {designerDraft.name}
            </p>
            <p className="text-sm text-slate-300">{designerDraft.description}</p>
          </motion.div>
        )}

        <IntegrationPanel
          connectors={connectors}
          onCreate={registerConnector}
          onAssign={attachConnector}
          modes={modes}
        />
      </section>

      <section className="flex flex-1 flex-col gap-6">
        <ChatWindow
          messages={messages}
          activeMode={activeMode}
          speaking={isStreaming}
          onReplay={handleReplay}
        />

        <motion.div
          layout
          className="surface noise-bg flex flex-col gap-4 rounded-3xl border border-slate-700/40 p-6"
        >
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm uppercase tracking-[0.3em] text-slate-300">
                Voice Console
              </h2>
              <p className="text-xs text-slate-400">
                {activeMode.name} • {activeMode.voicePersona}
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
              Auto Speak
              <button
                type="button"
                onClick={() => setAutoSpeak((prev) => !prev)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/40 bg-slate-900/60 text-slate-200 transition hover:border-slate-500/60"
              >
                {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            </label>
          </header>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            <VoiceRecorder
              onCapture={handleVoiceCapture}
              disabled={!hydrated || !customModesReady || !connectorsReady || isStreaming}
            />
            <div className="flex-1">
              <form onSubmit={handleSend} className="flex flex-col gap-3">
                <div className="rounded-3xl border border-slate-700/40 bg-slate-900/60 p-1 pl-4 pr-2">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-4 w-4 text-slate-500" />
                    <input
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder="Compose a brief or narrate intentions…"
                      className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-500 focus-visible:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isStreaming || !input.trim()}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-900 transition hover:bg-white disabled:opacity-60"
                    >
                      {isStreaming ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <ArrowUpCircle className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </form>
              <p className="text-xs text-slate-500">
                Integrations wired: {activeMode.connectorIds?.length ?? 0}. Voice capture uploads stay in-browser until
                dispatched to Gemini.
              </p>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
