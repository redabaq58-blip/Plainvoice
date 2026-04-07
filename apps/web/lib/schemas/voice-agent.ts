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
});

export type VoiceAgentCreateInput = z.infer<typeof voiceAgentCreateSchema>;

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
  };
}
