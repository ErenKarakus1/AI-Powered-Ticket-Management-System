import OpenAI from "openai";
import { env } from "../config/env.js";
import { getPrisma } from "../config/prisma.js";

type TicketPriorityValue = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type AnalyzeTicketInput = {
  ticketId: string;
  title: string;
  description: string;
};

type TicketAnalysisResult = {
  category: string;
  priority: TicketPriorityValue;
  summary: string;
};

const ticketPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

let openAiClient: OpenAI | null = null;

const getOpenAiClient = () => {
  if (!env.openAiApiKey) {
    return null;
  }

  if (!openAiClient) {
    openAiClient = new OpenAI({
      apiKey: env.openAiApiKey
    });
  }

  return openAiClient;
};

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
  const client = getOpenAiClient();

  if (!client) {
    return null;
  }

  const response = await client.responses.create({
    model: env.openAiModel,
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
    return null;
  }

  const prisma = getPrisma();

  return prisma.ticketAnalysis.upsert({
    where: {
      ticketId: input.ticketId
    },
    update: analysis,
    create: {
      ticketId: input.ticketId,
      ...analysis
    }
  });
};
