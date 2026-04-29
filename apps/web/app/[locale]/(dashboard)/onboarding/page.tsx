import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Database } from "@repo/database";
import { OnboardingClient } from "@/components/onboarding/onboarding-client";
import { createContactsSupabaseClient, getCurrentOrgId } from "@/lib/contacts-server";
import {
  defaultBusinessHours,
  normalizeBusinessHours,
  organizationSettingsSchema,
  toNullable,
  type OrganizationSettingsInput,
} from "@/lib/schemas/organization-settings";

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
>;

function fallbackOrganization(): SettingsOrganization {
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
  };
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
  };
}

async function getOrgSettings() {
  const orgId = await getCurrentOrgId();
  if (!orgId) {
    return null;
  }

  const supabase = await createContactsSupabaseClient();
  const { data: organization, error } = await supabase
    .from("organizations")
    .select(
      "name, business_email, business_phone, website_url, timezone, business_hours, default_language, default_voice_provider, default_voice_id, default_max_call_duration_minutes, booking_enabled, calcom_api_key, calcom_event_type_id, calcom_username, sms_enabled, sms_sender_phone_number_id, sms_sender_number, owner_notification_phone, sms_followup_template, sms_booking_confirmation_template, sms_missed_call_template, handoff_enabled, handoff_phone_number, urgent_handoff_enabled, handoff_fallback_message",
    )
    .eq("id", orgId)
    .single();

  if (error) {
    return fallbackOrganization();
  }

  return organization;
}

export default async function OnboardingPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("onboarding");
  const organization = await getOrgSettings();

  if (!organization) {
    redirect(`/${locale}/dashboard`);
  }

  async function saveSettings(input: OrganizationSettingsInput) {
    "use server";

    const parsed = organizationSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: "Invalid onboarding settings." };
    }

    const orgId = await getCurrentOrgId();
    if (!orgId) {
      return { ok: false, message: "Organization not found." };
    }

    const supabase = await createContactsSupabaseClient();
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
      })
      .eq("id", orgId);

    if (error) {
      return { ok: false, message: error.message };
    }

    return { ok: true, message: null };
  }

  return (
    <OnboardingClient
      locale={locale}
      initialSettings={toFormValues(organization)}
      saveSettings={saveSettings}
      labels={{
        title: t("title"),
        subtitle: t("subtitle"),
        loading: t("loading"),
        saving: t("saving"),
        saved: t("saved"),
        saveStep: t("saveStep"),
        next: t("next"),
        back: t("back"),
        complete: t("complete"),
        completed: t("completed"),
        incomplete: t("incomplete"),
        optional: t("optional"),
        error: t("error"),
        steps: [
          t("steps.profile"),
          t("steps.hours"),
          t("steps.agent"),
          t("steps.phone"),
          t("steps.integrations"),
          t("steps.test"),
        ],
        profile: {
          title: t("profile.title"),
          description: t("profile.description"),
          businessName: t("profile.businessName"),
          email: t("profile.email"),
          phone: t("profile.phone"),
          website: t("profile.website"),
          timezone: t("profile.timezone"),
        },
        hours: {
          title: t("hours.title"),
          description: t("hours.description"),
          open: t("hours.open"),
          closed: t("hours.closed"),
          openTime: t("hours.openTime"),
          closeTime: t("hours.closeTime"),
          days: {
            monday: t("hours.days.monday"),
            tuesday: t("hours.days.tuesday"),
            wednesday: t("hours.days.wednesday"),
            thursday: t("hours.days.thursday"),
            friday: t("hours.days.friday"),
            saturday: t("hours.days.saturday"),
            sunday: t("hours.days.sunday"),
          },
        },
        agent: {
          title: t("agent.title"),
          description: t("agent.description"),
          existing: t("agent.existing"),
          create: t("agent.create"),
          name: t("agent.name"),
          language: t("agent.language"),
          firstMessage: t("agent.firstMessage"),
          businessDescription: t("agent.businessDescription"),
          servicesOffered: t("agent.servicesOffered"),
          serviceArea: t("agent.serviceArea"),
          policies: t("agent.policies"),
          languageLabels: {
            fr: t("agent.languageLabels.fr"),
            en: t("agent.languageLabels.en"),
            bilingual: t("agent.languageLabels.bilingual"),
          },
        },
        phone: {
          title: t("phone.title"),
          description: t("phone.description"),
          noNumbers: t("phone.noNumbers"),
          manageNumbers: t("phone.manageNumbers"),
          assignedTo: t("phone.assignedTo"),
          unassigned: t("phone.unassigned"),
          active: t("phone.active"),
          vapiError: t("phone.vapiError"),
        },
        integrations: {
          title: t("integrations.title"),
          description: t("integrations.description"),
          calcom: t("integrations.calcom"),
          sms: t("integrations.sms"),
          enabled: t("integrations.enabled"),
          disabled: t("integrations.disabled"),
          settingsReady: t("integrations.settingsReady"),
          settingsMissing: t("integrations.settingsMissing"),
          openSettings: t("integrations.openSettings"),
        },
        test: {
          title: t("test.title"),
          description: t("test.description"),
          profile: t("test.profile"),
          hours: t("test.hours"),
          agent: t("test.agent"),
          phone: t("test.phone"),
          integrations: t("test.integrations"),
          testAgent: t("test.testAgent"),
          openDashboard: t("test.openDashboard"),
        },
      }}
    />
  );
}
