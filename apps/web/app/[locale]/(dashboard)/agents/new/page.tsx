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
          vapiWarning: t("form.vapiWarning"),
          knowledge: {
            title: t("form.knowledge.title"),
            businessDescription: t("form.knowledge.businessDescription"),
            businessDescriptionPlaceholder: t("form.knowledge.businessDescriptionPlaceholder"),
            servicesOffered: t("form.knowledge.servicesOffered"),
            servicesOfferedPlaceholder: t("form.knowledge.servicesOfferedPlaceholder"),
            pricingNotes: t("form.knowledge.pricingNotes"),
            pricingNotesPlaceholder: t("form.knowledge.pricingNotesPlaceholder"),
            faqs: t("form.knowledge.faqs"),
            question: t("form.knowledge.question"),
            questionPlaceholder: t("form.knowledge.questionPlaceholder"),
            answer: t("form.knowledge.answer"),
            answerPlaceholder: t("form.knowledge.answerPlaceholder"),
            addFaq: t("form.knowledge.addFaq"),
            removeFaq: t("form.knowledge.removeFaq"),
            policies: t("form.knowledge.policies"),
            policiesPlaceholder: t("form.knowledge.policiesPlaceholder"),
            emergencyInstructions: t("form.knowledge.emergencyInstructions"),
            emergencyInstructionsPlaceholder: t("form.knowledge.emergencyInstructionsPlaceholder"),
            serviceArea: t("form.knowledge.serviceArea"),
            serviceAreaPlaceholder: t("form.knowledge.serviceAreaPlaceholder"),
            tone: t("form.knowledge.tone"),
            toneLabels: {
              professional: t("form.knowledge.toneLabels.professional"),
              friendly: t("form.knowledge.toneLabels.friendly"),
              luxury: t("form.knowledge.toneLabels.luxury"),
              direct: t("form.knowledge.toneLabels.direct"),
            },
            promptPreview: t("form.knowledge.promptPreview"),
          },
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
