"use client";

import { FormEvent, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Plus, Sparkles } from "lucide-react";
import clsx from "clsx";
import { z } from "zod";
import type { AgentMode, DesignSuggestion } from "@/lib/types";

const designerSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(6),
  systemPrompt: z.string().min(20),
  primaryColor: z.string().min(4),
  accentColor: z.string().min(4),
  voicePersona: z.string().min(6),
  capabilities: z
    .string()
    .min(2)
    .transform((value) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
});

interface ModeDesignerProps {
  onCreate: (mode: AgentMode) => void;
  onDraft?: (mode: AgentMode) => void;
}

export function ModeDesigner({ onCreate, onDraft }: ModeDesignerProps) {
  const [values, setValues] = useState({
    name: "",
    description: "",
    systemPrompt: "",
    primaryColor: "#60f6d2",
    accentColor: "#6366f1",
    capabilities: "creative, strategist",
    voicePersona: "Warm, catalytic facilitator.",
  });
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const result = designerSchema.safeParse(values);

    if (!result.success) {
      setError("Fill each field before generating a mode.");
      return;
    }

    setSubmitting(true);
    const data = result.data;
    const newMode: AgentMode = {
      id: `${data.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      name: data.name,
      description: data.description,
      systemPrompt: data.systemPrompt,
      primaryColor: data.primaryColor,
      accentColor: data.accentColor,
      glow: `from-[${data.primaryColor}] via-[${data.accentColor}] to-[${data.primaryColor}]`,
      capabilities: data.capabilities,
      voicePersona: data.voicePersona,
    };

    onCreate(newMode);
    setSubmitting(false);
    setValues((prev) => ({
      ...prev,
      name: "",
      description: "",
      systemPrompt: "",
      capabilities: "creative, strategist",
    }));
  };

  const requestSuggestion = async () => {
    setSuggesting(true);
    setError(null);
    try {
      const response = await fetch("/api/designer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: values.description || "Invent a new agentic mode.",
          inspiration: values.systemPrompt,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate blueprint");
      }

      const payload = (await response.json()) as { suggestion: DesignSuggestion };
      const suggestion = payload.suggestion;
      onDraft?.(suggestion.mode);

      setValues({
        name: suggestion.mode.name,
        description: suggestion.mode.description,
        systemPrompt: suggestion.mode.systemPrompt,
        primaryColor: suggestion.mode.primaryColor,
        accentColor: suggestion.mode.accentColor,
        capabilities: suggestion.mode.capabilities.join(", "),
        voicePersona: suggestion.mode.voicePersona ?? "",
      });
    } catch (cause) {
      console.error(cause);
      setError("Blueprint synthesis failed. Try refining the brief.");
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="surface noise-bg flex flex-col gap-4 rounded-3xl border border-slate-700/50 p-6"
    >
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm uppercase tracking-[0.3em] text-slate-300">
            Agentic Designer
          </h2>
          <p className="text-xs text-slate-400">
            Compose new modes or ask Gemini to co-design blueprints.
          </p>
        </div>
        <button
          type="button"
          onClick={requestSuggestion}
          disabled={suggesting}
          className={clsx(
            "gradient-border relative flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]",
            "text-slate-100 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {suggesting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Blueprint
        </button>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <LabeledField
          label="Mode Name"
          value={values.name}
          onChange={(value) => setValues((prev) => ({ ...prev, name: value }))}
          placeholder="Astra Navigator"
        />
        <LabeledField
          label="Voice Persona"
          value={values.voicePersona}
          onChange={(value) =>
            setValues((prev) => ({ ...prev, voicePersona: value }))
          }
          placeholder="Playful systems thinker with cinematic pacing."
        />
      </div>

      <LabeledTextArea
        label="Mode Intent"
        value={values.description}
        onChange={(value) =>
          setValues((prev) => ({ ...prev, description: value }))
        }
        placeholder="An adaptive mode that can spin up new MCP connectors and orchestrate research sprints."
        rows={3}
      />

      <LabeledTextArea
        label="System Prompt"
        value={values.systemPrompt}
        onChange={(value) =>
          setValues((prev) => ({ ...prev, systemPrompt: value }))
        }
        placeholder="You are Astra, an innovation navigator who..."
        rows={4}
      />

      <LabeledField
        label="Capabilities (comma separated)"
        value={values.capabilities}
        onChange={(value) =>
          setValues((prev) => ({ ...prev, capabilities: value }))
        }
        placeholder="designer, engineer, strategist"
      />

      <div className="grid gap-3 md:grid-cols-2">
        <LabeledField
          label="Primary Hex"
          type="color"
          value={values.primaryColor}
          onChange={(value) =>
            setValues((prev) => ({ ...prev, primaryColor: value }))
          }
        />
        <LabeledField
          label="Accent Hex"
          type="color"
          value={values.accentColor}
          onChange={(value) =>
            setValues((prev) => ({ ...prev, accentColor: value }))
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <AnimatePresence mode="wait">
          {error ? (
            <motion.p
              key="error"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="text-xs text-rose-300"
            >
              {error}
            </motion.p>
          ) : (
            <motion.span
              key="hint"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="text-xs text-slate-400"
            >
              The assistant adapts instantly once you add a mode.
            </motion.span>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-white/90 disabled:opacity-70"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add Mode
        </button>
      </div>
    </form>
  );
}

interface LabeledFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  type?: string;
}

function LabeledField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: LabeledFieldProps) {
  return (
    <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
      {label}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={clsx(
          "rounded-2xl border border-slate-700/50 bg-slate-900/60 px-4 py-3 text-sm text-slate-100",
          "placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70",
        )}
      />
    </label>
  );
}

interface LabeledTextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

function LabeledTextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: LabeledTextAreaProps) {
  return (
    <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
      {label}
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={clsx(
          "rounded-2xl border border-slate-700/50 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 leading-relaxed",
          "placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70",
        )}
      />
    </label>
  );
}
