import { z } from "zod/v4";

export const CONTACT_LANGUAGES = ["fr", "en"] as const;

export const contactSchema = z.object({
  firstName: z.string().trim().max(80),
  lastName: z.string().trim().max(80),
  phone: z.string().trim().max(40),
  email: z.union([z.literal(""), z.string().email().max(160)]),
  company: z.string().trim().max(120),
  languagePreference: z.enum(CONTACT_LANGUAGES),
  leadScore: z.number().int().min(0).max(100),
  tags: z.string().trim().max(240),
  doNotCall: z.boolean(),
  notes: z.string().trim().max(4000),
});

export type ContactInput = z.infer<typeof contactSchema>;

export function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function tagsToInput(tags: string[]) {
  return tags.join(", ");
}

export function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function contactFromFormData(formData: FormData) {
  return contactSchema.safeParse({
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    company: String(formData.get("company") ?? ""),
    languagePreference: String(formData.get("languagePreference") ?? "fr"),
    leadScore: Number(formData.get("leadScore") ?? 0),
    tags: String(formData.get("tags") ?? ""),
    doNotCall: formData.get("doNotCall") === "on",
    notes: String(formData.get("notes") ?? ""),
  });
}

export function toContactPayload(input: ContactInput) {
  return {
    first_name: nullableText(input.firstName),
    last_name: nullableText(input.lastName),
    phone: nullableText(input.phone),
    email: nullableText(input.email),
    company: nullableText(input.company),
    language_preference: input.languagePreference,
    lead_score: input.leadScore,
    tags: parseTags(input.tags),
    do_not_call: input.doNotCall,
    notes: nullableText(input.notes),
  };
}
