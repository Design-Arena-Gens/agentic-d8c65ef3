export type AgentCapability =
  | "creative"
  | "developer"
  | "strategist"
  | "coach"
  | "researcher"
  | "designer"
  | string;

export interface AgentMode {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  primaryColor: string;
  accentColor: string;
  glow: string;
  capabilities: AgentCapability[];
  voicePersona?: string;
  connectorIds?: string[];
}

export interface AssistantMessage {
  id: string;
  modeId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  audioUrl?: string;
  meta?: Record<string, unknown>;
}

export interface VoiceCaptureResult {
  base64Audio: string;
  blobUrl: string;
  mimeType: string;
  durationMs: number;
}

export interface ConnectorBlueprint {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  authToken?: string;
  schema?: Record<string, unknown>;
  health?: {
    status: "online" | "degraded" | "offline";
    latency?: number;
    checkedAt?: number;
  };
}

export interface DesignSuggestion {
  mode: AgentMode;
  inspiration: string;
  headline: string;
  callToAction: string;
}
