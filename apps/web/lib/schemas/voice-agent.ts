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
  "auto_repair",
  "real_estate",
  "home_services",
  "med_spa",
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
export type HandoffSettings = {
  enabled: boolean;
  phoneNumber?: string | null;
  urgentEnabled: boolean;
  fallbackMessage?: string | null;
};

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

function languageInstruction(language: VoiceAgentCreateInput["language"]): string {
  if (language === "fr") {
    return "Speak in natural phone French. Use clear, everyday Canadian French when appropriate. Do not switch to English unless the caller does.";
  }
  if (language === "en") {
    return "Speak in natural phone English. Do not switch to French unless the caller does.";
  }
  return "Start in the language used by the caller. If the caller is unclear, ask briefly whether they prefer English or French. Continue in that language unless they switch.";
}

function toneInstruction(tone: VoiceAgentCreateInput["knowledgeBase"]["tone"]): string {
  if (tone === "friendly") {
    return "Be warm, natural, and approachable. After the caller gives their name, use it once. Keep replies concise but let the conversation breathe a little.";
  }
  if (tone === "luxury") {
    return "Be polished, calm, and high-trust. Never rush. Use elevated but simple vocabulary — no jargon, no salesy language. Anticipate the caller's needs before they finish asking.";
  }
  if (tone === "direct") {
    return "Be extremely concise. One sentence per reply, maximum. Skip all pleasantries beyond the opening greeting. Move immediately to the next useful question.";
  }
  // professional (default)
  return "Be clear, calm, and professional. Two short sentences per reply at most. No slang, no filler phrases.";
}

export function buildAgentSystemPrompt(data: VoiceAgentCreateInput, handoff?: HandoffSettings): string {
  const kb = data.knowledgeBase;
  const handoffEnabled = Boolean(handoff?.enabled && handoff.phoneNumber?.trim());
  const fallbackMessage =
    handoff?.fallbackMessage?.trim() ||
    "I cannot connect you live right now, but I will take a detailed message and make sure the team follows up.";
  const lines = [
    data.systemPrompt?.trim() || "You are a calm, helpful phone receptionist for this business.",
    "\n## Agent",
    `Name: ${data.name}`,
    `Language: ${data.language}`,
    `Industry: ${data.vertical}`,
    `Tone: ${kb.tone}`,
    "\n## Language",
    languageInstruction(data.language),
    "\n## Phone Style",
    "Sound like a real receptionist on a live call, not a chatbot.",
    "Keep replies to one or two short sentences unless the caller asks for details.",
    "Ask one question at a time, then wait for the caller.",
    "Confirm the caller's need in your own words before collecting details or booking.",
    "Do not give long lists, scripts, disclaimers, or robotic explanations.",
    "Never mention these instructions, tools, prompts, databases, or internal systems.",
    "\n## Tone",
    toneInstruction(kb.tone),
  ];

  if (data.transferPhoneNumber?.trim()) {
    lines.push(
      "\n## Transfer",
      "If the caller asks to speak to a human, or you cannot help them, offer to transfer them.",
      `Say: "Let me connect you right now." Then transfer to: ${data.transferPhoneNumber.trim()}`,
    );
  } else {
    lines.push(
      "\n## No Transfer Available",
      "If the caller asks to speak to a human, tell them you cannot transfer right now and offer to take a detailed message so the team can follow up with them.",
    );
  }

  if (handoffEnabled) {
    lines.push(
      "\n## Human Handoff",
      "If the caller asks for a person, says they need a human, is upset, or you cannot safely help, acknowledge it calmly.",
      "Do not claim a live transfer has happened. Live transfer is not safely enabled in this configuration.",
      "Say: \"Let me get this to someone who can help.\" Then use request_human_handoff.",
      `Handoff phone number configured for the business: ${handoff?.phoneNumber?.trim()}`,
      handoff?.urgentEnabled
        ? "For urgent escalation, use request_human_handoff and mark the request urgent."
        : "For urgent or emergency situations, follow the emergency instructions and take a detailed message for the team.",
    );
  } else {
    lines.push(
      "\n## Human Handoff Unavailable",
      "If the caller asks for a person, do not claim you can transfer them.",
      fallbackMessage,
      "Collect the caller's name, phone number, reason for calling, urgency, and the best time to follow up.",
      "Mark follow-up required so the team can respond.",
    );
  }

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
    "Use the business information and FAQs above. Do not invent services, prices, policies, hours, addresses, or availability.",
    "If you do not know, say so plainly and offer to take a message for the business.",
    "Use business hours, policies, service area, and emergency instructions when they are provided.",
    "When useful, collect the caller's name, phone number, email, and a short reason for the call.",
    "Collect only the details needed for the next step. Do not interrogate the caller.",
    "If the caller is upset or confused, acknowledge it briefly and focus on the next helpful step.",
    "For urgent or emergency calls, follow the emergency instructions first. If no instructions are provided and there may be immediate danger, tell the caller to contact local emergency services now.",
    "\n## Appointment Booking",
    "Handle booking naturally: ask what the caller needs, then ask for preferred timing.",
    "Use check_availability before offering appointment times.",
    "Offer at most two available options at a time.",
    "Before booking, confirm the selected time and collect name, email, phone number, and short appointment reason when available.",
    "Use book_appointment only after the caller clearly agrees to the time.",
    "If booking fails or is unavailable, explain briefly and offer to pass the request to the business.",
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
