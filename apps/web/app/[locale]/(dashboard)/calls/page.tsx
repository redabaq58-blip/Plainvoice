import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { CallsClient } from "@/components/calls/calls-client";

const PAGE_SIZE = 20;

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    direction?: string;
    sentiment?: string;
    dateFrom?: string;
    dateTo?: string;
    phone?: string;
  }>;
};

type CallRow = {
  id: string;
  direction: string;
  status: string;
  sentiment: string | null;
  from_number: string | null;
  to_number: string | null;
  started_at: string | null;
  duration_seconds: number | null;
  credits_used: number | null;
  agent_id: string | null;
  voice_agents: { name: string } | null;
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default async function CallsPage({ params, searchParams }: Props) {
  await params;
  const sp = await searchParams;

  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const from = (page - 1) * PAGE_SIZE;

  const t = await getTranslations("calls");
  const supabase = await createSupabaseServerClient();

  // Build server-side filters
  let query = supabase
    .from("calls")
    .select("id, direction, status, sentiment, from_number, to_number, started_at, duration_seconds, credits_used, agent_id, voice_agents(name)", {
      count: "exact",
    })
    .order("started_at", { ascending: false });

  if (sp.direction && sp.direction !== "all") {
    query = query.eq("direction", sp.direction);
  }
  if (sp.sentiment && sp.sentiment !== "all") {
    if (sp.sentiment === "unknown") {
      query = query.is("sentiment", null);
    } else {
      query = query.eq("sentiment", sp.sentiment);
    }
  }
  if (sp.dateFrom) {
    query = query.gte("started_at", sp.dateFrom);
  }
  if (sp.dateTo) {
    // include the full end day
    query = query.lte("started_at", sp.dateTo + "T23:59:59Z");
  }
  if (sp.phone) {
    query = query.ilike("from_number", `%${sp.phone}%`);
  }

  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);

  const calls = (data ?? []) as CallRow[];
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Stats: aggregate for current month (separate query, not from paginated slice)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: monthCalls } = await supabase
    .from("calls")
    .select("duration_seconds, sentiment")
    .gte("started_at", monthStart);

  const monthData = monthCalls ?? [];
  const totalCallsThisMonth = monthData.length;
  const totalSecondsThisMonth = monthData.reduce(
    (sum, c) => sum + (c.duration_seconds ?? 0),
    0,
  );
  const totalMinutesThisMonth = Math.round(totalSecondsThisMonth / 60);
  const avgDurationSeconds =
    totalCallsThisMonth > 0
      ? Math.round(totalSecondsThisMonth / totalCallsThisMonth)
      : 0;

  const sentimentBreakdown = {
    positive: monthData.filter((c) => c.sentiment === "positive").length,
    neutral: monthData.filter((c) => c.sentiment === "neutral").length,
    negative: monthData.filter((c) => c.sentiment === "negative").length,
    unknown: monthData.filter((c) => c.sentiment == null).length,
  };

  const stats = {
    totalCallsThisMonth,
    totalMinutesThisMonth,
    avgDuration: formatDuration(avgDurationSeconds),
    sentimentBreakdown,
  };

  // Resolve org_id for realtime subscription
  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id")
    .limit(1)
    .single();
  const orgId: string = member?.org_id ?? "";

  return (
    <CallsClient
      calls={calls.map((c) => ({
        id: c.id,
        direction: c.direction,
        status: c.status,
        sentiment: c.sentiment,
        from_number: c.from_number,
        started_at: c.started_at,
        duration_seconds: c.duration_seconds,
        credits_used: c.credits_used,
        agentName: c.voice_agents?.name ?? null,
      }))}
      stats={stats}
      page={page}
      totalPages={totalPages}
      totalCount={totalCount}
      orgId={orgId}
      filters={{
        direction: sp.direction ?? "all",
        sentiment: sp.sentiment ?? "all",
        dateFrom: sp.dateFrom ?? "",
        dateTo: sp.dateTo ?? "",
        phone: sp.phone ?? "",
      }}
      labels={{
        title: t("title"),
        empty: { title: t("empty.title"), description: t("empty.description") },
        stats: {
          totalCalls: t("stats.totalCalls"),
          totalMinutes: t("stats.totalMinutes"),
          avgDuration: t("stats.avgDuration"),
          sentiment: t("stats.sentiment"),
        },
        filters: {
          dateFrom: t("filters.dateFrom"),
          dateTo: t("filters.dateTo"),
          allDirections: t("filters.allDirections"),
          allSentiments: t("filters.allSentiments"),
          phonePlaceholder: t("filters.phonePlaceholder"),
        },
        table: {
          date: t("table.date"),
          direction: t("table.direction"),
          from: t("table.from"),
          duration: t("table.duration"),
          agent: t("table.agent"),
          sentiment: t("table.sentiment"),
          actions: t("table.actions"),
        },
        direction: {
          inbound: t("direction.inbound"),
          outbound: t("direction.outbound"),
          web: t("direction.web"),
        },
        sentiment: {
          positive: t("sentiment.positive"),
          neutral: t("sentiment.neutral"),
          negative: t("sentiment.negative"),
          unknown: t("sentiment.unknown"),
        },
        pagination: {
          previous: t("pagination.previous"),
          next: t("pagination.next"),
          page: t("pagination.page", { current: page, total: totalPages }),
        },
      }}
    />
  );
}
