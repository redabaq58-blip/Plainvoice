import { z } from "zod/v4";

export const VERTICALS = [
  "dental",
  "plumbing",
  "hvac",
  "beauty",
  "trades",
  "restaurant",
  "legal",
  "general",
] as const;

export const LANGUAGES = ["fr", "en", "bilingual"] as const;

export const VOICE_PROVIDERS = ["elevenlabs", "azure", "deepgram"] as const;

export const STATUSES = ["draft", "active", "paused"] as const;

export const MAX_DURATIONS = [5, 10, 15, 20] as const;

export const TONES = ["professional", "friendly", "luxury", "direct"] as const;

export const knowledgeBaseFaqSchema = z.object({
  question: z.string().max(500).optional(),
  answer: z.string().max(1000).optional(),
});

export const knowledgeBaseSchema = z.object({
  businessDescription: z.string().max(2000).optional(),
  servicesOffered: z.string().max(3000).optional(),
  pricingNotes: z.string().max(2000).optional(),
  faqs: z.array(knowledgeBaseFaqSchema).max(10),
  policies: z.string().max(2500).optional(),
  emergencyInstructions: z.string().max(2000).optional(),
  serviceArea: z.string().max(1500).optional(),
  tone: z.enum(TONES),
});

export const voiceAgentCreateSchema = z.object({
  name: z.string().min(1).max(100),
  vertical: z.enum(VERTICALS),
  language: z.enum(LANGUAGES),
  voiceProvider: z.enum(VOICE_PROVIDERS),
  voiceId: z.string().optional(),
  firstMessage: z.string().optional(),
  systemPrompt: z.string().optional(),
  transferPhoneNumber: z.string().optional(),
  maxCallDurationMinutes: z.number().min(5).max(20),
  status: z.enum(STATUSES),
  knowledgeBase: knowledgeBaseSchema,
});

export type VoiceAgentCreateInput = z.infer<typeof voiceAgentCreateSchema>;
export type KnowledgeBaseInput = z.infer<typeof knowledgeBaseSchema>;

export const defaultKnowledgeBase: KnowledgeBaseInput = {
  businessDescription: "",
  servicesOffered: "",
  pricingNotes: "",
  faqs: [{ question: "", answer: "" }],
  policies: "",
  emergencyInstructions: "",
  serviceArea: "",
  tone: "professional",
};

function normalizeKnowledgeBase(value: unknown): KnowledgeBaseInput {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return defaultKnowledgeBase;
  }

  const parsed = knowledgeBaseSchema.safeParse({
    ...defaultKnowledgeBase,
    ...(value as Record<string, unknown>),
  });

  return parsed.success ? parsed.data : defaultKnowledgeBase;
}

function appendPromptSection(lines: string[], title: string, value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return;
  lines.push(`\n## ${title}`, trimmed);
}

export function buildAgentSystemPrompt(data: VoiceAgentCreateInput): string {
  const kb = data.knowledgeBase;
  const lines = [
    data.systemPrompt?.trim() || "You are a helpful AI receptionist for this business.",
    "\n## Agent",
    `Name: ${data.name}`,
    `Language: ${data.language}`,
    `Industry: ${data.vertical}`,
    `Tone: ${kb.tone}`,
  ];

  appendPromptSection(lines, "Business Description", kb.businessDescription);
  appendPromptSection(lines, "Services Offered", kb.servicesOffered);
  appendPromptSection(lines, "Pricing Notes", kb.pricingNotes);
  appendPromptSection(lines, "Policies", kb.policies);
  appendPromptSection(lines, "Emergency Instructions", kb.emergencyInstructions);
  appendPromptSection(lines, "Service Area / Address", kb.serviceArea);

  const faqs = kb.faqs.filter((faq) => faq.question?.trim() || faq.answer?.trim());
  if (faqs.length > 0) {
    lines.push("\n## FAQs");
    for (const faq of faqs) {
      if (faq.question?.trim()) lines.push(`Q: ${faq.question.trim()}`);
      if (faq.answer?.trim()) lines.push(`A: ${faq.answer.trim()}`);
    }
  }

  lines.push(
    "\n## Call Handling",
    "Answer using only the business information above when possible.",
    "If the caller asks for something unknown, say you will pass the message to the business.",
    "Keep responses concise, natural, and suitable for a phone conversation.",
  );

  return lines.join("\n");
}

/** Transform camelCase form values to snake_case for the API. */
export function toApiPayload(data: VoiceAgentCreateInput): Record<string, unknown> {
  return {
    name: data.name,
    vertical: data.vertical,
    language: data.language,
    voice_provider: data.voiceProvider,
    voice_id: data.voiceId || null,
    first_message: data.firstMessage || null,
    system_prompt: data.systemPrompt || null,
    transfer_phone_number: data.transferPhoneNumber || null,
    max_call_duration_minutes: data.maxCallDurationMinutes,
    status: data.status,
    knowledge_base: data.knowledgeBase,
  };
}

/** Transform snake_case API response to camelCase for the form. */
export function fromApiResponse(agent: Record<string, unknown>): VoiceAgentCreateInput {
  return {
    name: agent.name as string,
    vertical: (agent.vertical as VoiceAgentCreateInput["vertical"]) ?? "general",
    language: (agent.language as VoiceAgentCreateInput["language"]) ?? "fr",
    voiceProvider: (agent.voice_provider as VoiceAgentCreateInput["voiceProvider"]) ?? "elevenlabs",
    voiceId: (agent.voice_id as string) ?? undefined,
    firstMessage: (agent.first_message as string) ?? undefined,
    systemPrompt: (agent.system_prompt as string) ?? undefined,
    transferPhoneNumber: (agent.transfer_phone_number as string) ?? undefined,
    maxCallDurationMinutes: (agent.max_call_duration_minutes as number) ?? 10,
    status: (agent.status as VoiceAgentCreateInput["status"]) ?? "draft",
    knowledgeBase: normalizeKnowledgeBase(agent.knowledge_base),
  };
}
