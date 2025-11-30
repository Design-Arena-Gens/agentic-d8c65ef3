"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import { Link2, Loader2, Satellite } from "lucide-react";
import clsx from "clsx";
import type { AgentMode, ConnectorBlueprint } from "@/lib/types";

interface IntegrationPanelProps {
  connectors: ConnectorBlueprint[];
  onCreate: (connector: ConnectorBlueprint) => void;
  onAssign: (modeId: string, connectorId: string) => void;
  modes: AgentMode[];
}

export function IntegrationPanel({
  connectors,
  onCreate,
  onAssign,
  modes,
}: IntegrationPanelProps) {
  const [values, setValues] = useState({
    name: "",
    description: "",
    baseUrl: "",
    authToken: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const connector: ConnectorBlueprint = {
      id: `${values.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      name: values.name,
      description: values.description,
      baseUrl: values.baseUrl,
      authToken: values.authToken || undefined,
      schema: {},
    };
    onCreate(connector);
    setSubmitting(false);
    setValues({ name: "", description: "", baseUrl: "", authToken: "" });
  };

  const assignConnector = (connectorId: string, modeId: string) => {
    onAssign(modeId, connectorId);
  };

  return (
    <section className="surface noise-bg flex flex-col gap-4 rounded-3xl border border-slate-700/50 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm uppercase tracking-[0.3em] text-slate-300">
            MCP / API Integrations
          </h2>
          <p className="text-xs text-slate-400">
            Register external capabilities and wire them into modes instantly.
          </p>
        </div>
        <Satellite className="h-5 w-5 text-slate-500" />
      </header>

      <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
        <LabeledField
          label="Connector Name"
          value={values.name}
          onChange={(value) => setValues((prev) => ({ ...prev, name: value }))}
          placeholder="Telemetry Hub"
        />
        <LabeledField
          label="Base URL"
          value={values.baseUrl}
          onChange={(value) =>
            setValues((prev) => ({ ...prev, baseUrl: value }))
          }
          placeholder="https://api.example.com"
        />
        <LabeledField
          label="Auth Token"
          value={values.authToken}
          onChange={(value) =>
            setValues((prev) => ({ ...prev, authToken: value }))
          }
          placeholder="Optional"
        />
        <LabeledField
          label="Description"
          value={values.description}
          onChange={(value) =>
            setValues((prev) => ({ ...prev, description: value }))
          }
          placeholder="Streams live product metrics."
        />
        <div className="md:col-span-2 flex items-center justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 rounded-full bg-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-white disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            Register Connector
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {connectors.length === 0 ? (
          <p className="text-sm text-slate-400">
            No connectors yet. Capture REST endpoints, MCP servers, or streaming
            APIs here.
          </p>
        ) : (
          connectors.map((connector) => (
            <motion.div
              key={connector.id}
              layout
              className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    {connector.name}
                  </h3>
                  <p className="text-xs text-slate-400">{connector.description}</p>
                  <code className="text-xs text-slate-500">
                    {connector.baseUrl}
                  </code>
                </div>
                <div className="flex flex-wrap gap-2">
                  {modes.map((mode) => {
                    const assigned = mode.connectorIds?.includes(connector.id);
                    return (
                      <button
                        key={`${mode.id}-${connector.id}`}
                        type="button"
                        onClick={() => assignConnector(connector.id, mode.id)}
                        className={clsx(
                          "rounded-full border px-3 py-1 text-xs transition",
                          assigned
                            ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-200"
                            : "border-slate-600/50 text-slate-300 hover:border-slate-400 hover:text-slate-100",
                        )}
                      >
                        Assign {mode.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </section>
  );
}

interface LabeledFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

function LabeledField({
  label,
  value,
  onChange,
  placeholder,
}: LabeledFieldProps) {
  return (
    <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-slate-400">
      {label}
      <input
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
