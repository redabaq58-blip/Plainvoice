import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Database } from "@repo/database";
import {
  Bot,
  CalendarCheck,
  Clock,
  Contact,
  MessageSquareText,
  Phone,
  PhoneMissed,
  Siren,
  UserPlus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createContactsSupabaseClient, getCurrentOrgId } from "@/lib/contacts-server";

type Props = {
  params: Promise<{ locale: string }>;
};

type Json = Database["public"]["Tables"]["calls"]["Row"]["sms_status"];

type CallRow = {
  id: string;
  agent_id: string | null;
  booking_result: Json | null;
  duration_seconds: number | null;
  ended_reason: string | null;
  from_number: string | null;
  follow_up_required: boolean;
  outcome: string | null;
  sms_status: Json;
  started_at: string | null;
  status: string;
  summary: string | null;
  urgency: string;
};

type ContactRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company: string | null;
  created_at: string;
};

type AgentRow = {
  id: string;
  name: string;
  status: string;
};

function monthStartIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function isRecord(value: Json | null | undefined): value is Record<string, Json | undefined> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isSuccessfulBooking(value: Json | null) {
  return isRecord(value) && value.ok === true;
}

function smsCounts(calls: CallRow[]) {
  let sent = 0;
  let failed = 0;

  for (const call of calls) {
    if (!isRecord(call.sms_status)) {
      continue;
    }

    for (const value of Object.values(call.sms_status)) {
      if (!isRecord(value)) {
        continue;
      }
      if (value.ok === true) {
        sent += 1;
      } else if (value.status === "failed") {
        failed += 1;
      }
    }
  }

  return { sent, failed };
}

function isMissedOrFailed(call: CallRow) {
  const reason = (call.ended_reason ?? "").toLowerCase();
  return (
    call.status === "failed" ||
    call.status === "cancelled" ||
    reason.includes("no-answer") ||
    reason.includes("missed") ||
    call.duration_seconds === 0
  );
}

function fullName(contact: ContactRow) {
  return [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "-";
}

function formatDateTime(value: string | null, locale: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "0 min";
  return `${Math.round(seconds / 60)} min`;
}

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("dashboard");
  const orgId = await getCurrentOrgId();

  if (!orgId) {
    redirect(`/${locale}/dashboard`);
  }

  const supabase = await createContactsSupabaseClient();
  const monthStart = monthStartIso();

  const [
    organizationResult,
    monthCallsResult,
    recentCallsResult,
    contactsCountResult,
    newContactsResult,
    recentContactsResult,
    agentsResult,
  ] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", orgId).single(),
    supabase
      .from("calls")
      .select(
        "id, agent_id, booking_result, duration_seconds, ended_reason, follow_up_required, from_number, outcome, sms_status, started_at, status, summary, urgency",
      )
      .eq("org_id", orgId)
      .gte("started_at", monthStart)
      .order("started_at", { ascending: false }),
    supabase
      .from("calls")
      .select("id, agent_id, booking_result, duration_seconds, ended_reason, follow_up_required, from_number, outcome, sms_status, started_at, status, summary, urgency")
      .eq("org_id", orgId)
      .order("started_at", { ascending: false })
      .limit(5),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .gte("created_at", monthStart),
    supabase
      .from("contacts")
      .select("id, first_name, last_name, phone, company, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("voice_agents")
      .select("id, name, status")
      .eq("org_id", orgId)
      .order("name", { ascending: true }),
  ]);

  const orgName = organizationResult.data?.name ?? "PlainVoice Demo";
  const monthCalls = (monthCallsResult.data ?? []) as CallRow[];
  const recentCalls = (recentCallsResult.data ?? []) as CallRow[];
  const recentContacts = (recentContactsResult.data ?? []) as ContactRow[];
  const agents = (agentsResult.data ?? []) as AgentRow[];
  const agentNames = new Map(agents.map((agent) => [agent.id, agent.name]));
  const totalSecondsThisMonth = monthCalls.reduce(
    (sum, call) => sum + (call.duration_seconds ?? 0),
    0,
  );
  const completedCalls = monthCalls.filter((call) => call.status === "completed").length;
  const missedOrFailedCalls = monthCalls.filter(isMissedOrFailed).length;
  const appointmentBookings = monthCalls.filter((call) =>
    call.outcome === "booked_appointment" || isSuccessfulBooking(call.booking_result),
  ).length;
  const newLeadCalls = monthCalls.filter((call) => call.outcome === "new_lead").length;
  const urgentCalls = monthCalls.filter((call) => call.urgency === "urgent" || call.outcome === "urgent").length;
  const followUpRequiredCalls = monthCalls.filter((call) => call.follow_up_required).length;
  const missedOpportunityCalls = monthCalls.filter((call) => call.outcome === "missed_opportunity").length;
  const sms = smsCounts(monthCalls);

  const callsByAgent = new Map<string, number>();
  for (const call of monthCalls) {
    if (!call.agent_id) {
      continue;
    }
    callsByAgent.set(call.agent_id, (callsByAgent.get(call.agent_id) ?? 0) + 1);
  }

  const topAgents = [...callsByAgent.entries()]
    .map(([agentId, totalCalls]) => ({
      id: agentId,
      name: agentNames.get(agentId) ?? t("unknownAgent"),
      totalCalls,
    }))
    .sort((a, b) => b.totalCalls - a.totalCalls)
    .slice(0, 5);

  const stats = [
    { label: t("metrics.totalCallsThisMonth"), value: String(monthCalls.length), icon: Phone },
    { label: t("metrics.completedCallsThisMonth"), value: String(completedCalls), icon: Phone },
    { label: t("metrics.missedFailedCalls"), value: String(missedOrFailedCalls), icon: PhoneMissed },
    { label: t("metrics.totalMinutesThisMonth"), value: formatDuration(totalSecondsThisMonth), icon: Clock },
    { label: t("metrics.activeAgents"), value: String(agents.filter((agent) => agent.status === "active").length), icon: Bot },
    { label: t("metrics.totalContacts"), value: String(contactsCountResult.count ?? 0), icon: Contact },
    { label: t("metrics.newContactsThisMonth"), value: String(newContactsResult.count ?? 0), icon: UserPlus },
    { label: t("metrics.appointmentsBooked"), value: String(appointmentBookings), icon: CalendarCheck },
    { label: t("metrics.newLeadCalls"), value: String(newLeadCalls), icon: UserPlus },
    { label: t("metrics.urgentCalls"), value: String(urgentCalls), icon: Siren },
    { label: t("metrics.followUpRequired"), value: String(followUpRequiredCalls), icon: PhoneMissed },
    { label: t("metrics.missedOpportunities"), value: String(missedOpportunityCalls), icon: PhoneMissed },
    { label: t("metrics.smsSentFailed"), value: `${sms.sent}/${sms.failed}`, icon: MessageSquareText },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("welcome", { org: orgName })}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("recentCalls.title")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentCalls.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                {t("recentCalls.empty")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("recentCalls.caller")}</TableHead>
                    <TableHead>{t("recentCalls.status")}</TableHead>
                    <TableHead>{t("recentCalls.agent")}</TableHead>
                    <TableHead>{t("recentCalls.when")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCalls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell>
                        <Link href={`/${locale}/calls/${call.id}`} className="hover:underline">
                          {call.from_number ?? "-"}
                        </Link>
                      </TableCell>
                      <TableCell>{call.status}</TableCell>
                      <TableCell>{call.agent_id ? agentNames.get(call.agent_id) ?? "-" : "-"}</TableCell>
                      <TableCell>{formatDateTime(call.started_at, locale)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("recentContacts.title")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentContacts.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                {t("recentContacts.empty")}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("recentContacts.name")}</TableHead>
                    <TableHead>{t("recentContacts.phone")}</TableHead>
                    <TableHead>{t("recentContacts.company")}</TableHead>
                    <TableHead>{t("recentContacts.created")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <Link
                          href={`/${locale}/contacts/${contact.id}`}
                          className="hover:underline"
                        >
                          {fullName(contact)}
                        </Link>
                      </TableCell>
                      <TableCell>{contact.phone ?? "-"}</TableCell>
                      <TableCell>{contact.company ?? "-"}</TableCell>
                      <TableCell>{formatDateTime(contact.created_at, locale)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("topAgents.title")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {topAgents.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">{t("topAgents.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("topAgents.agent")}</TableHead>
                  <TableHead className="text-right">{t("topAgents.calls")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topAgents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>{agent.name}</TableCell>
                    <TableCell className="text-right">{agent.totalCalls}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
