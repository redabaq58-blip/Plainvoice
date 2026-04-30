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
  normalizeWorkflowRecipes,
  organizationSettingsSchema,
  toNullable,
  toWorkflowRecipesJson,
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
  | "sms_enabled"
  | "sms_sender_phone_number_id"
  | "sms_sender_number"
  | "owner_notification_phone"
  | "sms_followup_template"
  | "sms_booking_confirmation_template"
  | "sms_missed_call_template"
  | "handoff_enabled"
  | "handoff_phone_number"
  | "urgent_handoff_enabled"
  | "handoff_fallback_message"
  | "workflow_recipes"
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
      "id, name, business_email, business_phone, website_url, timezone, business_hours, default_language, default_voice_provider, default_voice_id, default_max_call_duration_minutes, booking_enabled, calcom_api_key, calcom_event_type_id, calcom_username, sms_enabled, sms_sender_phone_number_id, sms_sender_number, owner_notification_phone, sms_followup_template, sms_booking_confirmation_template, sms_missed_call_template, handoff_enabled, handoff_phone_number, urgent_handoff_enabled, handoff_fallback_message, workflow_recipes",
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
      sms_enabled: false,
      sms_sender_phone_number_id: null,
      sms_sender_number: null,
      owner_notification_phone: null,
      sms_followup_template: null,
      sms_booking_confirmation_template: null,
      sms_missed_call_template: null,
      handoff_enabled: false,
      handoff_phone_number: null,
      urgent_handoff_enabled: true,
      handoff_fallback_message: null,
      workflow_recipes: {},
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
    smsEnabled: organization.sms_enabled,
    smsSenderPhoneNumberId: organization.sms_sender_phone_number_id ?? "",
    smsSenderNumber: organization.sms_sender_number ?? "",
    ownerNotificationPhone: organization.owner_notification_phone ?? "",
    smsFollowupTemplate: organization.sms_followup_template ?? "",
    smsBookingConfirmationTemplate: organization.sms_booking_confirmation_template ?? "",
    smsMissedCallTemplate: organization.sms_missed_call_template ?? "",
    handoffEnabled: organization.handoff_enabled,
    handoffPhoneNumber: organization.handoff_phone_number ?? "",
    urgentHandoffEnabled: organization.urgent_handoff_enabled,
    handoffFallbackMessage: organization.handoff_fallback_message ?? "",
    workflowRecipes: normalizeWorkflowRecipes(organization.workflow_recipes),
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
    smsTitle: t("sms.title"),
    smsEnabled: t("sms.enabled"),
    smsSenderNumber: t("sms.senderNumber"),
    smsSenderNumberPlaceholder: t("sms.senderNumberPlaceholder"),
    ownerNotificationPhone: t("sms.ownerNotificationPhone"),
    ownerNotificationPhonePlaceholder: t("sms.ownerNotificationPhonePlaceholder"),
    smsFollowupTemplate: t("sms.followupTemplate"),
    smsFollowupTemplatePlaceholder: t("sms.followupTemplatePlaceholder"),
    smsBookingConfirmationTemplate: t("sms.bookingConfirmationTemplate"),
    smsBookingConfirmationTemplatePlaceholder: t("sms.bookingConfirmationTemplatePlaceholder"),
    smsMissedCallTemplate: t("sms.missedCallTemplate"),
    smsMissedCallTemplatePlaceholder: t("sms.missedCallTemplatePlaceholder"),
    handoffTitle: t("handoff.title"),
    handoffDescription: t("handoff.description"),
    handoffEnabled: t("handoff.enabled"),
    handoffPhoneNumber: t("handoff.phoneNumber"),
    handoffPhoneNumberPlaceholder: t("handoff.phoneNumberPlaceholder"),
    urgentHandoffEnabled: t("handoff.urgentEnabled"),
    handoffFallbackMessage: t("handoff.fallbackMessage"),
    handoffFallbackMessagePlaceholder: t("handoff.fallbackMessagePlaceholder"),
    workflowTitle: t("workflow.title"),
    workflowDescription: t("workflow.description"),
    workflowTrigger: t("workflow.trigger"),
    workflowAction: t("workflow.action"),
    workflowRecipes: {
      missed_call_text_back: {
        name: t("workflow.recipes.missed_call_text_back.name"),
        description: t("workflow.recipes.missed_call_text_back.description"),
        trigger: t("workflow.recipes.missed_call_text_back.trigger"),
        action: t("workflow.recipes.missed_call_text_back.action"),
      },
      new_lead_create_task: {
        name: t("workflow.recipes.new_lead_create_task.name"),
        description: t("workflow.recipes.new_lead_create_task.description"),
        trigger: t("workflow.recipes.new_lead_create_task.trigger"),
        action: t("workflow.recipes.new_lead_create_task.action"),
      },
      urgent_call_notify_owner: {
        name: t("workflow.recipes.urgent_call_notify_owner.name"),
        description: t("workflow.recipes.urgent_call_notify_owner.description"),
        trigger: t("workflow.recipes.urgent_call_notify_owner.trigger"),
        action: t("workflow.recipes.urgent_call_notify_owner.action"),
      },
      booking_failed_create_task: {
        name: t("workflow.recipes.booking_failed_create_task.name"),
        description: t("workflow.recipes.booking_failed_create_task.description"),
        trigger: t("workflow.recipes.booking_failed_create_task.trigger"),
        action: t("workflow.recipes.booking_failed_create_task.action"),
      },
      no_handoff_take_message_create_task: {
        name: t("workflow.recipes.no_handoff_take_message_create_task.name"),
        description: t("workflow.recipes.no_handoff_take_message_create_task.description"),
        trigger: t("workflow.recipes.no_handoff_take_message_create_task.trigger"),
        action: t("workflow.recipes.no_handoff_take_message_create_task.action"),
      },
      quote_request_create_task: {
        name: t("workflow.recipes.quote_request_create_task.name"),
        description: t("workflow.recipes.quote_request_create_task.description"),
        trigger: t("workflow.recipes.quote_request_create_task.trigger"),
        action: t("workflow.recipes.quote_request_create_task.action"),
      },
      complaint_create_task: {
        name: t("workflow.recipes.complaint_create_task.name"),
        description: t("workflow.recipes.complaint_create_task.description"),
        trigger: t("workflow.recipes.complaint_create_task.trigger"),
        action: t("workflow.recipes.complaint_create_task.action"),
      },
      sms_failed_create_inbox_item: {
        name: t("workflow.recipes.sms_failed_create_inbox_item.name"),
        description: t("workflow.recipes.sms_failed_create_inbox_item.description"),
        trigger: t("workflow.recipes.sms_failed_create_inbox_item.trigger"),
        action: t("workflow.recipes.sms_failed_create_inbox_item.action"),
      },
    },
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
        sms_enabled: parsed.data.smsEnabled,
        sms_sender_phone_number_id: toNullable(parsed.data.smsSenderPhoneNumberId),
        sms_sender_number: toNullable(parsed.data.smsSenderNumber),
        owner_notification_phone: toNullable(parsed.data.ownerNotificationPhone),
        sms_followup_template: toNullable(parsed.data.smsFollowupTemplate),
        sms_booking_confirmation_template: toNullable(
          parsed.data.smsBookingConfirmationTemplate,
        ),
        sms_missed_call_template: toNullable(parsed.data.smsMissedCallTemplate),
        handoff_enabled: parsed.data.handoffEnabled,
        handoff_phone_number: toNullable(parsed.data.handoffPhoneNumber),
        urgent_handoff_enabled: parsed.data.urgentHandoffEnabled,
        handoff_fallback_message: toNullable(parsed.data.handoffFallbackMessage),
        workflow_recipes: toWorkflowRecipesJson(
          parsed.data.workflowRecipes,
        ) as unknown as OrganizationUpdate["workflow_recipes"],
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
