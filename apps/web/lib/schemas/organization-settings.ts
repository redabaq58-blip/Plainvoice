import { z } from "zod/v4";

export const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export const LANGUAGES = ["fr", "en", "bilingual"] as const;
export const VOICE_PROVIDERS = ["elevenlabs", "azure", "deepgram"] as const;
export const MAX_CALL_DURATIONS = [5, 10, 15, 20] as const;
export const WORKFLOW_RECIPE_IDS = [
  "missed_call_text_back",
  "new_lead_create_task",
  "urgent_call_notify_owner",
  "booking_failed_create_task",
  "no_handoff_take_message_create_task",
  "quote_request_create_task",
  "complaint_create_task",
  "sms_failed_create_inbox_item",
] as const;

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const businessDaySchema = z.object({
  isOpen: z.boolean(),
  openTime: timeSchema,
  closeTime: timeSchema,
});

export const businessHoursSchema = z.object(
  DAYS.reduce(
    (shape, day) => ({
      ...shape,
      [day]: businessDaySchema,
    }),
    {} as Record<(typeof DAYS)[number], typeof businessDaySchema>,
  ),
);

export const organizationSettingsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  businessEmail: z.union([z.literal(""), z.string().email().max(160)]),
  businessPhone: z.string().trim().max(40),
  websiteUrl: z.union([z.literal(""), z.string().url().max(240)]),
  timezone: z.string().trim().min(1).max(80),
  businessHours: businessHoursSchema,
  defaultLanguage: z.enum(LANGUAGES),
  defaultVoiceProvider: z.enum(VOICE_PROVIDERS),
  defaultVoiceId: z.string().trim().max(160),
  defaultMaxCallDurationMinutes: z.number().min(5).max(20),
  bookingEnabled: z.boolean(),
  calcomApiKey: z.string().trim().max(240),
  calcomEventTypeId: z.string().trim().max(80),
  calcomUsername: z.string().trim().max(120),
  smsEnabled: z.boolean(),
  smsSenderPhoneNumberId: z.string().trim().max(80),
  smsSenderNumber: z.string().trim().max(40),
  ownerNotificationPhone: z.string().trim().max(40),
  smsFollowupTemplate: z.string().trim().max(500),
  smsBookingConfirmationTemplate: z.string().trim().max(500),
  smsMissedCallTemplate: z.string().trim().max(500),
  handoffEnabled: z.boolean(),
  handoffPhoneNumber: z.string().trim().max(40),
  urgentHandoffEnabled: z.boolean(),
  handoffFallbackMessage: z.string().trim().max(500),
  workflowRecipes: z.object(
    WORKFLOW_RECIPE_IDS.reduce(
      (shape, recipeId) => ({
        ...shape,
        [recipeId]: z.boolean(),
      }),
      {} as Record<(typeof WORKFLOW_RECIPE_IDS)[number], z.ZodBoolean>,
    ),
  ),
});

export type BusinessDay = z.infer<typeof businessDaySchema>;
export type BusinessHours = z.infer<typeof businessHoursSchema>;
export type OrganizationSettingsInput = z.infer<typeof organizationSettingsSchema>;

export const defaultBusinessDay: BusinessDay = {
  isOpen: true,
  openTime: "09:00",
  closeTime: "17:00",
};

export const defaultBusinessHours: BusinessHours = {
  monday: defaultBusinessDay,
  tuesday: defaultBusinessDay,
  wednesday: defaultBusinessDay,
  thursday: defaultBusinessDay,
  friday: defaultBusinessDay,
  saturday: { ...defaultBusinessDay, isOpen: false },
  sunday: { ...defaultBusinessDay, isOpen: false },
};

export const defaultWorkflowRecipes: OrganizationSettingsInput["workflowRecipes"] =
  WORKFLOW_RECIPE_IDS.reduce(
    (recipes, recipeId) => ({
      ...recipes,
      [recipeId]: false,
    }),
    {} as OrganizationSettingsInput["workflowRecipes"],
  );

export function normalizeBusinessHours(value: unknown): BusinessHours {
  const parsed = businessHoursSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }
  return defaultBusinessHours;
}

export function normalizeWorkflowRecipes(value: unknown): OrganizationSettingsInput["workflowRecipes"] {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return WORKFLOW_RECIPE_IDS.reduce((recipes, recipeId) => {
    const entry = (raw as Record<string, unknown>)[recipeId];
    return {
      ...recipes,
      [recipeId]:
        typeof entry === "object" && entry !== null && "enabled" in entry
          ? Boolean((entry as { enabled?: unknown }).enabled)
          : Boolean(entry),
    };
  }, defaultWorkflowRecipes);
}

export function toWorkflowRecipesJson(
  recipes: OrganizationSettingsInput["workflowRecipes"],
) {
  const updatedAt = new Date().toISOString();
  return WORKFLOW_RECIPE_IDS.reduce(
    (payload, recipeId) => ({
      ...payload,
      [recipeId]: {
        enabled: recipes[recipeId],
        updated_at: updatedAt,
      },
    }),
    {} as Record<(typeof WORKFLOW_RECIPE_IDS)[number], { enabled: boolean; updated_at: string }>,
  );
}

export function toNullable(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
