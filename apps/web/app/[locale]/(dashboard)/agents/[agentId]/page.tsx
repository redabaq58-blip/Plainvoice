import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { AgentDetailTabs } from "@/components/agents/agent-detail-tabs";
import { fromApiResponse } from "@/lib/schemas/voice-agent";

type Props = {
  params: Promise<{ locale: string; agentId: string }>;
};

export default async function AgentDetailPage({ params }: Props) {
  const { locale, agentId } = await params;
  const t = await getTranslations("agents");
  const supabase = await createSupabaseServerClient();

  // Fetch agent (RLS ensures org scope)
  const { data: agent } = await supabase
    .from("voice_agents")
    .select("*")
    .eq("id", agentId)
    .single();

  if (!agent) notFound();

  // Fetch call stats
  const { data: calls } = await supabase
    .from("calls")
    .select("id, duration_seconds, caller_number, status, created_at")
    .eq("voice_agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(10);

  const recentCalls = calls ?? [];
  const totalCalls = recentCalls.length;
  const avgDuration =
    totalCalls > 0
      ? recentCalls.reduce(
          (sum, c) => sum + (c.duration_seconds ?? 0),
          0,
        ) / totalCalls
      : 0;

  const agentDefaults = fromApiResponse(agent as unknown as Record<string, unknown>);

  const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
    active: "default",
    paused: "secondary",
    draft: "outline",
  };

  const formLabels = {
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
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
        <Badge variant={STATUS_VARIANT[agent.status] ?? "outline"}>
          {t(`status.${agent.status}` as Parameters<typeof t>[0])}
        </Badge>
      </div>

      <AgentDetailTabs
        locale={locale}
        vapiAssistantId={agent.vapi_assistant_id}
        agentId={agent.id}
        agentDefaults={agentDefaults}
        totalCalls={totalCalls}
        avgDuration={avgDuration}
        recentCalls={recentCalls}
        tabLabels={{
          overview: t("detail.overview"),
          test: t("detail.test"),
          settings: t("detail.settings"),
          callHistory: t("detail.callHistory"),
          totalCalls: t("detail.totalCalls"),
          avgDuration: t("detail.avgDuration"),
          noCallsYet: t("detail.noCallsYet"),
        }}
        testLabels={{
          start: t("test.start"),
          end: t("test.end"),
          connecting: t("test.connecting"),
          active: t("test.active"),
          idle: t("test.idle"),
          ended: t("test.ended"),
        }}
        formLabels={formLabels}
      />
    </div>
  );
}
