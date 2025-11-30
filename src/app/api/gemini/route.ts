import { NextResponse } from "next/server";
import type { AgentMode, AssistantMessage, ConnectorBlueprint, VoiceCaptureResult } from "@/lib/types";

interface GeminiRequestPayload {
  mode: AgentMode;
  history: AssistantMessage[];
  inputText: string | null;
  audio?: VoiceCaptureResult | null;
  connectors?: ConnectorBlueprint[];
}

type GeminiContent = {
  role: "user" | "model" | "system";
  parts: { text?: string; inlineData?: { data: string; mimeType: string } }[];
};

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY env var missing. Add it and redeploy." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as GeminiRequestPayload;
  const { mode, history, inputText, audio, connectors = [] } = body;

  const systemPrelude = [
    `You are operating in the mode "${mode.name}".`,
    mode.systemPrompt,
    mode.voicePersona
      ? `Use a voice aligned with this persona: ${mode.voicePersona}.`
      : "",
    connectors.length
      ? `The runtime has the following connectors available:\n${connectors
          .map(
            (connector) =>
              `• ${connector.name} | ${connector.baseUrl} :: ${connector.description}`,
          )
          .join("\n")}\nDescribe how you would call or orchestrate them when relevant.`
      : "No external connectors are currently attached. Offer guidance on how to extend capabilities when helpful.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const formattedHistory: GeminiContent[] = history.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [
      {
        text: message.content,
      },
    ],
  }));

  const liveUserContent: GeminiContent = {
    role: "user",
    parts: [],
  };

  if (inputText) {
    liveUserContent.parts.push({ text: inputText });
  }

  if (audio?.base64Audio) {
    liveUserContent.parts.push({
      inlineData: {
        data: audio.base64Audio,
        mimeType: audio.mimeType,
      },
    });
  }

  if (liveUserContent.parts.length === 0) {
    liveUserContent.parts.push({
      text: "User triggered interaction without additional payload.",
    });
  }

  const payload = {
    system_instruction: {
      role: "system" as const,
      parts: [{ text: systemPrelude }],
    },
    contents: [...formattedHistory, liveUserContent],
    generationConfig: {
      temperature: 0.75,
      topP: 0.85,
      topK: 64,
      maxOutputTokens: 768,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("Gemini Live request failed", error);
    return NextResponse.json(
      { error: error.error?.message ?? "Unable to generate content." },
      { status: 502 },
    );
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const primaryText =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join("\n\n")
      .trim() ?? "No response available.";

  return NextResponse.json({ message: primaryText });
}
