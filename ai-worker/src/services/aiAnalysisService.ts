import OpenAI from "openai";
import { env } from "../config/env.js";

type TicketPriorityValue = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type AnalyzeTicketInput = {
  title: string;
  description: string;
};

type TicketAnalysisResult = {
  category: string;
  priority: TicketPriorityValue;
  summary: string;
};

const ticketPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

if (!env.openAiApiKey) {
  throw new Error("OPENAI_API_KEY is required");
}

const openAiClient = new OpenAI({
  apiKey: env.openAiApiKey
});

const isTicketPriority = (value: unknown): value is TicketPriorityValue => {
  return typeof value === "string" && ticketPriorities.includes(value as TicketPriorityValue);
};

const parseTicketAnalysis = (value: string): TicketAnalysisResult | null => {
  try {
    const parsed = JSON.parse(value) as {
      category?: unknown;
      priority?: unknown;
      summary?: unknown;
    };

    if (
      typeof parsed.category !== "string" ||
      !isTicketPriority(parsed.priority) ||
      typeof parsed.summary !== "string"
    ) {
      return null;
    }

    return {
      category: parsed.category.trim().slice(0, 80),
      priority: parsed.priority,
      summary: parsed.summary.trim().slice(0, 500)
    };
  } catch {
    return null;
  }
};

export const analyzeTicketWithAi = async (input: AnalyzeTicketInput) => {
  const response = await openAiClient.responses.create({
    model: env.openAiModel,
    max_output_tokens: 250,
    input: [
      {
        role: "developer",
        content:
          "Analyze support tickets for a helpdesk. Return only JSON matching the requested schema. Choose priority from LOW, MEDIUM, HIGH, URGENT."
      },
      {
        role: "user",
        content: `Title: ${input.title}\n\nDescription: ${input.description}`
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "ticket_analysis",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            category: {
              type: "string",
              description: "A short support category such as Billing, Login, Bug, or Feature Request."
            },
            priority: {
              type: "string",
              enum: ticketPriorities
            },
            summary: {
              type: "string",
              description: "A concise one-sentence summary for support staff."
            }
          },
          required: ["category", "priority", "summary"]
        }
      }
    }
  });

  const analysis = parseTicketAnalysis(response.output_text);

  if (!analysis) {
    throw new Error("OpenAI returned an invalid ticket analysis payload");
  }

  return analysis;
};
