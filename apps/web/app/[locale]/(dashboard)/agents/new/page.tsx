import { getTranslations } from "next-intl/server";
import { AgentForm } from "@/components/agents/agent-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewAgentPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("agents");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {t("createAgent")}
      </h1>
      <AgentForm
        locale={locale}
        mode="create"
        labels={{
          name: t("form.name"),
          namePlaceholder: t("form.namePlaceholder"),
          vertical: t("form.vertical"),
          language: t("form.language"),
          voiceProvider: t("form.voiceProvider"),
          voiceId: t("form.voiceId"),
          voiceIdPlaceholder: t("form.voiceIdPlaceholder"),
          firstMessage: t("form.firstMessage"),
          firstMessagePlaceholder: t("form.firstMessagePlaceholder"),
          systemPrompt: t("form.systemPrompt"),
          systemPromptPlaceholder: t("form.systemPromptPlaceholder"),
          transferPhoneNumber: t("form.transferPhoneNumber"),
          transferPhoneNumberPlaceholder: t("form.transferPhoneNumberPlaceholder"),
          maxCallDuration: t("form.maxCallDuration"),
          maxCallDurationMinutes: Object.fromEntries(
            [5, 10, 15, 20].map((m) => [String(m), t("form.maxCallDurationMinutes", { minutes: m })])
          ),
          status: t("form.status"),
          submit: t("form.submit"),
          save: t("form.save"),
          verticalLabels: {
            dental: t("vertical.dental"),
            plumbing: t("vertical.plumbing"),
            hvac: t("vertical.hvac"),
            beauty: t("vertical.beauty"),
            trades: t("vertical.trades"),
            restaurant: t("vertical.restaurant"),
            legal: t("vertical.legal"),
            general: t("vertical.general"),
          },
          languageLabels: {
            fr: t("language.fr"),
            en: t("language.en"),
            bilingual: t("language.bilingual"),
          },
          voiceProviderLabels: {
            elevenlabs: t("voiceProvider.elevenlabs"),
            azure: t("voiceProvider.azure"),
            deepgram: t("voiceProvider.deepgram"),
          },
          statusLabels: {
            draft: t("status.draft"),
            active: t("status.active"),
            paused: t("status.paused"),
          },
        }}
      />
    </div>
  );
}
