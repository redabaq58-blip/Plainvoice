import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";
import type { Database } from "@repo/database";
import { createSupabaseServerClient } from "@/lib/supabase";
import { isAuthBypassed } from "@/lib/auth-bypass";
import { SettingsClient, type SettingsLabels } from "@/components/settings/settings-client";
import {
  defaultBusinessHours,
  normalizeBusinessHours,
  organizationSettingsSchema,
  toNullable,
  type OrganizationSettingsInput,
} from "@/lib/schemas/organization-settings";

const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";

type Props = {
  params: Promise<{ locale: string }>;
};

type OrganizationRow = Database["public"]["Tables"]["organizations"]["Row"];
type OrganizationUpdate = Database["public"]["Tables"]["organizations"]["Update"];
type SettingsOrganization = Pick<
  OrganizationRow,
  | "name"
  | "business_email"
  | "business_phone"
  | "website_url"
  | "timezone"
  | "business_hours"
  | "default_language"
  | "default_voice_provider"
  | "default_voice_id"
  | "default_max_call_duration_minutes"
  | "booking_enabled"
  | "calcom_api_key"
  | "calcom_event_type_id"
  | "calcom_username"
>;

function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase service role configuration");
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getCurrentOrgId() {
  if (isAuthBypassed()) {
    return DEMO_ORG_ID;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  return member?.org_id ?? null;
}

async function getOrgSettings() {
  const orgId = await getCurrentOrgId();
  if (!orgId) {
    return null;
  }

  const supabase = isAuthBypassed()
    ? createServiceRoleClient()
    : await createSupabaseServerClient();

  const { data: organization, error } = await supabase
    .from("organizations")
    .select(
      "id, name, business_email, business_phone, website_url, timezone, business_hours, default_language, default_voice_provider, default_voice_id, default_max_call_duration_minutes, booking_enabled, calcom_api_key, calcom_event_type_id, calcom_username",
    )
    .eq("id", orgId)
    .single();

  if (error && isAuthBypassed()) {
    return {
      name: "PlainVoice Demo",
      business_email: null,
      business_phone: null,
      website_url: null,
      timezone: "America/Toronto",
      business_hours: defaultBusinessHours,
      default_language: "fr",
      default_voice_provider: "elevenlabs",
      default_voice_id: null,
      default_max_call_duration_minutes: 10,
      booking_enabled: false,
      calcom_api_key: null,
      calcom_event_type_id: null,
      calcom_username: null,
    } satisfies SettingsOrganization;
  }

  return organization;
}

function toFormValues(organization: SettingsOrganization): OrganizationSettingsInput {
  return {
    name: organization.name,
    businessEmail: organization.business_email ?? "",
    businessPhone: organization.business_phone ?? "",
    websiteUrl: organization.website_url ?? "",
    timezone: organization.timezone,
    businessHours: normalizeBusinessHours(organization.business_hours),
    defaultLanguage: organization.default_language as OrganizationSettingsInput["defaultLanguage"],
    defaultVoiceProvider:
      organization.default_voice_provider as OrganizationSettingsInput["defaultVoiceProvider"],
    defaultVoiceId: organization.default_voice_id ?? "",
    defaultMaxCallDurationMinutes: organization.default_max_call_duration_minutes,
    bookingEnabled: organization.booking_enabled,
    calcomApiKey: organization.calcom_api_key ?? "",
    calcomEventTypeId: organization.calcom_event_type_id ?? "",
    calcomUsername: organization.calcom_username ?? "",
  };
}

function buildLabels(t: Awaited<ReturnType<typeof getTranslations>>): SettingsLabels {
  return {
    title: t("title"),
    subtitle: t("subtitle"),
    profileTitle: t("profile.title"),
    organizationName: t("profile.organizationName"),
    businessEmail: t("profile.businessEmail"),
    businessPhone: t("profile.businessPhone"),
    websiteUrl: t("profile.websiteUrl"),
    timezone: t("profile.timezone"),
    businessHoursTitle: t("businessHours.title"),
    open: t("businessHours.open"),
    closed: t("businessHours.closed"),
    openTime: t("businessHours.openTime"),
    closeTime: t("businessHours.closeTime"),
    voiceTitle: t("voice.title"),
    defaultLanguage: t("voice.defaultLanguage"),
    defaultVoiceProvider: t("voice.defaultVoiceProvider"),
    defaultVoiceId: t("voice.defaultVoiceId"),
    defaultVoiceIdPlaceholder: t("voice.defaultVoiceIdPlaceholder"),
    defaultMaxCallDuration: t("voice.defaultMaxCallDuration"),
    bookingTitle: t("booking.title"),
    bookingEnabled: t("booking.enabled"),
    calcomApiKey: t("booking.calcomApiKey"),
    calcomApiKeyPlaceholder: t("booking.calcomApiKeyPlaceholder"),
    calcomEventTypeId: t("booking.calcomEventTypeId"),
    calcomEventTypeIdPlaceholder: t("booking.calcomEventTypeIdPlaceholder"),
    calcomUsername: t("booking.calcomUsername"),
    calcomUsernamePlaceholder: t("booking.calcomUsernamePlaceholder"),
    save: t("save"),
    saving: t("saving"),
    saved: t("saved"),
    error: t("error"),
    days: {
      monday: t("days.monday"),
      tuesday: t("days.tuesday"),
      wednesday: t("days.wednesday"),
      thursday: t("days.thursday"),
      friday: t("days.friday"),
      saturday: t("days.saturday"),
      sunday: t("days.sunday"),
    },
    languages: {
      fr: t("languages.fr"),
      en: t("languages.en"),
      bilingual: t("languages.bilingual"),
    },
    voiceProviders: {
      elevenlabs: t("voiceProviders.elevenlabs"),
      azure: t("voiceProviders.azure"),
      deepgram: t("voiceProviders.deepgram"),
    },
    durations: {
      "5": t("durations.5"),
      "10": t("durations.10"),
      "15": t("durations.15"),
      "20": t("durations.20"),
    },
  };
}

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("settings");
  const organization = await getOrgSettings();

  if (!organization) {
    redirect(`/${locale}/dashboard`);
  }

  async function saveSettings(input: OrganizationSettingsInput) {
    "use server";

    const parsed = organizationSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: "Invalid settings." };
    }

    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { ok: false, message: "Organization not found." };
    }

    const supabase = isAuthBypassed()
      ? createServiceRoleClient()
      : await createSupabaseServerClient();

    const { error } = await supabase
      .from("organizations")
      .update({
        name: parsed.data.name,
        business_email: toNullable(parsed.data.businessEmail),
        business_phone: toNullable(parsed.data.businessPhone),
        website_url: toNullable(parsed.data.websiteUrl),
        timezone: parsed.data.timezone,
        business_hours: parsed.data
          .businessHours as unknown as OrganizationUpdate["business_hours"],
        default_language: parsed.data.defaultLanguage,
        default_voice_provider: parsed.data.defaultVoiceProvider,
        default_voice_id: toNullable(parsed.data.defaultVoiceId),
        default_max_call_duration_minutes: parsed.data.defaultMaxCallDurationMinutes,
        booking_enabled: parsed.data.bookingEnabled,
        calcom_api_key: toNullable(parsed.data.calcomApiKey),
        calcom_event_type_id: toNullable(parsed.data.calcomEventTypeId),
        calcom_username: toNullable(parsed.data.calcomUsername),
      })
      .eq("id", orgId);

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: null };
  }

  return (
    <SettingsClient
      initialValues={toFormValues(organization)}
      labels={buildLabels(t)}
      saveSettings={saveSettings}
    />
  );
}
