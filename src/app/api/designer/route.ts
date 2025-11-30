import { NextResponse } from "next/server";
import type { AgentMode, DesignSuggestion } from "@/lib/types";

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY environment variable." },
      { status: 500 },
    );
  }

  const { brief, inspiration } = (await request.json()) as {
    brief: string;
    inspiration?: string;
  };

  const schema = [
    "{",
    `"mode": {`,
    `  "name": "string",`,
    `  "description": "string",`,
    `  "systemPrompt": "string",`,
    `  "primaryColor": "hex string",`,
    `  "accentColor": "hex string",`,
    `  "glow": "tailwind gradient classes",`,
    `  "capabilities": ["string"],`,
    `  "voicePersona": "string"`,
    `},`,
    `"headline": "string",`,
    `"inspiration": "string",`,
    `"callToAction": "string"`,
    "}",
  ].join("\n");

  const prompt = [
    "You are an autonomous agentic product designer.",
    "Synthesize a new Gemini Live mode blueprint responding to this brief:",
    brief,
    inspiration ? `Existing inspiration:\n${inspiration}` : "",
    "Return ONLY valid JSON that matches this exact schema:",
    schema,
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 512,
          temperature: 0.85,
        },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    return NextResponse.json(
      { error: error.error?.message ?? "Blueprint generation failed." },
      { status: 502 },
    );
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const raw =
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .join("\n")
      .trim() ?? "{}";

  const jsonString = extractJson(raw);

  try {
    const suggestion = JSON.parse(jsonString) as DesignSuggestion;
    const mode: AgentMode = {
      ...suggestion.mode,
      id: `${suggestion.mode.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
    };
    return NextResponse.json({
      suggestion: { ...suggestion, mode },
    });
  } catch (error) {
    console.error("Failed to parse design suggestion", error, raw);
    return NextResponse.json(
      { error: "Designer response parsing failed." },
      { status: 500 },
    );
  }
}

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : "{}";
}
