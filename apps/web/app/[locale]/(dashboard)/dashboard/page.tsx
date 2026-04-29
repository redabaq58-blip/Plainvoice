import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Database } from "@repo/database";
import {
  AlertTriangle,
  Bot,
  CalendarCheck,
  Clock,
  ClipboardList,
  Contact,
  MessageSquareWarning,
  MessageSquareText,
  Phone,
  PhoneMissed,
  Siren,
  UserPlus,
  XCircle,
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
  searchParams: Promise<{ digestRange?: DigestRange }>;
};

type Json = Database["public"]["Tables"]["calls"]["Row"]["sms_status"];
type DigestRange = "today" | "last7" | "month";

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

type SmsRow = {
  id: string;
  status: string;
  provider_status: string | null;
  error: string | null;
  call_id: string | null;
  contact_id: string | null;
  recipient: string | null;
  created_at: string;
};

type TaskRow = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_at: string | null;
  call_id: string | null;
  contact_id: string | null;
  created_at: string;
};

type AutomationEventRow = {
  id: string;
  event_type: string;
  status: string;
  call_id: string | null;
  contact_id: string | null;
  phone_number: string | null;
  message: string;
  error: string | null;
  created_at: string;
};

type AgentRow = {
  id: string;
  name: string;
  status: string;
};

type AttentionItem = {
  key: string;
  label: string;
  detail: string;
  href: string;
  timestamp: string;
  icon: typeof AlertTriangle;
};

const DIGEST_RANGES: DigestRange[] = ["today", "last7", "month"];

function monthStartIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function todayStartIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}

function last7StartIso() {
  return new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString();
}

function rangeStartIso(range: DigestRange) {
  if (range === "today") return todayStartIso();
  if (range === "last7") return last7StartIso();
  return monthStartIso();
}

function isRecord(value: Json | null | undefined): value is Record<string, Json | undefined> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isSuccessfulBooking(value: Json | null) {
  return isRecord(value) && value.ok === true;
}

function isFailedBooking(value: Json | null) {
  return isRecord(value) && (value.ok === false || value.error != null);
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

function isSentSms(message: SmsRow) {
  const status = `${message.status} ${message.provider_status ?? ""}`.toLowerCase();
  return status.includes("sent") || status.includes("delivered") || status.includes("queued") || message.status === "success";
}

function isFailedSms(message: SmsRow) {
  const status = `${message.status} ${message.provider_status ?? ""}`.toLowerCase();
  return Boolean(message.error) || status.includes("failed") || status.includes("undelivered") || message.status === "failed";
}

function inRange<T extends { created_at?: string; started_at?: string | null }>(rows: T[], startIso: string) {
  const startMs = new Date(startIso).getTime();
  return rows.filter((row) => new Date(row.started_at ?? row.created_at ?? 0).getTime() >= startMs);
}

function attentionDetail(value: string | null | undefined, fallback: string) {
  if (!value) return fallback;
  return value.length > 120 ? `${value.slice(0, 117)}...` : value;
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

export default async function DashboardPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations("dashboard");
  const orgId = await getCurrentOrgId();

  if (!orgId) {
    redirect(`/${locale}/dashboard`);
  }

  const supabase = await createContactsSupabaseClient();
  const monthStart = monthStartIso();
  const todayStart = todayStartIso();
  const last7Start = last7StartIso();
  const earliestDigestStart = new Date(
    Math.min(new Date(monthStart).getTime(), new Date(last7Start).getTime()),
  ).toISOString();
  const activeRange: DigestRange = DIGEST_RANGES.includes(sp.digestRange ?? "today")
    ? sp.digestRange ?? "today"
    : "today";
  const activeRangeStart = rangeStartIso(activeRange);

  const [
    organizationResult,
    monthCallsResult,
    recentCallsResult,
    contactsCountResult,
    newContactsResult,
    recentContactsResult,
    agentsResult,
    digestCallsResult,
    digestContactsResult,
    digestSmsResult,
    digestTasksResult,
    digestEventsResult,
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
    supabase
      .from("calls")
      .select(
        "id, agent_id, booking_result, duration_seconds, ended_reason, follow_up_required, from_number, outcome, sms_status, started_at, status, summary, urgency",
      )
      .eq("org_id", orgId)
      .gte("started_at", earliestDigestStart)
      .order("started_at", { ascending: false }),
    supabase
      .from("contacts")
      .select("id, first_name, last_name, phone, company, created_at")
      .eq("org_id", orgId)
      .gte("created_at", earliestDigestStart)
      .order("created_at", { ascending: false }),
    supabase
      .from("sms_messages")
      .select("id, status, provider_status, error, call_id, contact_id, recipient, created_at")
      .eq("org_id", orgId)
      .gte("created_at", earliestDigestStart)
      .order("created_at", { ascending: false }),
    supabase
      .from("follow_up_tasks")
      .select("id, title, status, priority, due_at, call_id, contact_id, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("automation_events")
      .select("id, event_type, status, call_id, contact_id, phone_number, message, error, created_at")
      .eq("org_id", orgId)
      .gte("created_at", earliestDigestStart)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const orgName = organizationResult.data?.name ?? "PlainVoice Demo";
  const monthCalls = (monthCallsResult.data ?? []) as CallRow[];
  const recentCalls = (recentCallsResult.data ?? []) as CallRow[];
  const recentContacts = (recentContactsResult.data ?? []) as ContactRow[];
  const agents = (agentsResult.data ?? []) as AgentRow[];
  const digestCalls = (digestCallsResult.data ?? []) as CallRow[];
  const digestContacts = (digestContactsResult.data ?? []) as ContactRow[];
  const digestSms = (digestSmsResult.data ?? []) as SmsRow[];
  const digestTasks = (digestTasksResult.data ?? []) as TaskRow[];
  const digestEvents = (digestEventsResult.data ?? []) as AutomationEventRow[];
  const agentNames = new Map(agents.map((agent) => [agent.id, agent.name]));
  const todayCalls = inRange(digestCalls, todayStart);
  const last7Calls = inRange(digestCalls, last7Start);
  const activeCalls = inRange(digestCalls, activeRangeStart);
  const todayContacts = inRange(digestContacts, todayStart);
  const last7Contacts = inRange(digestContacts, last7Start);
  const activeContacts = inRange(digestContacts, activeRangeStart);
  const activeSms = inRange(digestSms, activeRangeStart);
  const activeEvents = inRange(digestEvents, activeRangeStart);
  const openTasks = digestTasks.filter((task) => task.status === "open");
  const overdueTasks = openTasks.filter((task) => task.due_at && new Date(task.due_at).getTime() < Date.now());
  const openPriorityTasks = openTasks.filter((task) => task.priority === "high" || task.priority === "urgent");
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
  const digestBookedToday = todayCalls.filter((call) =>
    call.outcome === "booked_appointment" || isSuccessfulBooking(call.booking_result),
  ).length;
  const digestBookedLast7 = last7Calls.filter((call) =>
    call.outcome === "booked_appointment" || isSuccessfulBooking(call.booking_result),
  ).length;
  const digestBookedActive = activeCalls.filter((call) =>
    call.outcome === "booked_appointment" || isSuccessfulBooking(call.booking_result),
  ).length;
  const digestUrgentCalls = activeCalls.filter((call) => call.urgency === "urgent" || call.outcome === "urgent");
  const digestFollowUps = activeCalls.filter((call) => call.follow_up_required || call.outcome === "needs_follow_up");
  const digestMissedOpportunities = activeCalls.filter((call) => call.outcome === "missed_opportunity");
  const digestFailedBookings = activeCalls.filter((call) => isFailedBooking(call.booking_result));
  const digestSmsSent = activeSms.filter(isSentSms).length;
  const digestSmsFailedRows = activeSms.filter(isFailedSms);
  const failedAutomationEvents = activeEvents.filter((event) => event.status === "failed");
  const hasDigestActivity =
    activeCalls.length > 0 ||
    activeContacts.length > 0 ||
    digestBookedActive > 0 ||
    digestSmsSent > 0 ||
    digestUrgentCalls.length > 0;

  const digestStats = [
    { label: t("digest.metrics.callsToday"), value: String(todayCalls.length), icon: Phone },
    { label: t("digest.metrics.callsLast7"), value: String(last7Calls.length), icon: Phone },
    { label: t("digest.metrics.newLeadsToday"), value: String(todayContacts.length), icon: UserPlus },
    { label: t("digest.metrics.newLeadsLast7"), value: String(last7Contacts.length), icon: UserPlus },
    { label: t("digest.metrics.bookedToday"), value: String(digestBookedToday), icon: CalendarCheck },
    { label: t("digest.metrics.bookedLast7"), value: String(digestBookedLast7), icon: CalendarCheck },
    { label: t("digest.metrics.urgentCalls"), value: String(digestUrgentCalls.length), icon: Siren },
    { label: t("digest.metrics.followUpRequired"), value: String(digestFollowUps.length), icon: PhoneMissed },
    { label: t("digest.metrics.missedOpportunities"), value: String(digestMissedOpportunities.length), icon: AlertTriangle },
    { label: t("digest.metrics.smsSent"), value: String(digestSmsSent), icon: MessageSquareText },
    { label: t("digest.metrics.smsFailed"), value: String(digestSmsFailedRows.length), icon: MessageSquareWarning },
    { label: t("digest.metrics.openTasks"), value: String(openTasks.length), icon: ClipboardList },
    { label: t("digest.metrics.overdueTasks"), value: String(overdueTasks.length), icon: Clock },
    { label: t("digest.metrics.failedAutomations"), value: String(failedAutomationEvents.length), icon: XCircle },
  ] as const;

  const attentionItems: AttentionItem[] = [
    ...digestUrgentCalls.map((call) => ({
      key: `urgent-${call.id}`,
      label: t("digest.attention.urgentCall"),
      detail: attentionDetail(call.summary, call.from_number ?? t("digest.attention.unknownCaller")),
      href: `/${locale}/calls/${call.id}`,
      timestamp: call.started_at ?? new Date().toISOString(),
      icon: Siren,
    })),
    ...digestFollowUps.map((call) => ({
      key: `follow-up-${call.id}`,
      label: t("digest.attention.followUpCall"),
      detail: attentionDetail(call.summary, call.from_number ?? t("digest.attention.unknownCaller")),
      href: `/${locale}/calls/${call.id}`,
      timestamp: call.started_at ?? new Date().toISOString(),
      icon: PhoneMissed,
    })),
    ...digestSmsFailedRows.map((message) => ({
      key: `sms-${message.id}`,
      label: t("digest.attention.failedSms"),
      detail: attentionDetail(message.error, message.recipient ?? t("digest.attention.unknownRecipient")),
      href: message.call_id ? `/${locale}/calls/${message.call_id}` : `/${locale}/activity`,
      timestamp: message.created_at,
      icon: MessageSquareWarning,
    })),
    ...digestFailedBookings.map((call) => ({
      key: `booking-${call.id}`,
      label: t("digest.attention.failedBooking"),
      detail: attentionDetail(call.summary, call.from_number ?? t("digest.attention.unknownCaller")),
      href: `/${locale}/calls/${call.id}`,
      timestamp: call.started_at ?? new Date().toISOString(),
      icon: CalendarCheck,
    })),
    ...openPriorityTasks.map((task) => ({
      key: `task-${task.id}`,
      label: t("digest.attention.priorityTask"),
      detail: task.title,
      href: `/${locale}/tasks`,
      timestamp: task.due_at ?? task.created_at,
      icon: ClipboardList,
    })),
    ...digestMissedOpportunities.map((call) => ({
      key: `missed-${call.id}`,
      label: t("digest.attention.missedOpportunity"),
      detail: attentionDetail(call.summary, call.from_number ?? t("digest.attention.unknownCaller")),
      href: `/${locale}/calls/${call.id}`,
      timestamp: call.started_at ?? new Date().toISOString(),
      icon: AlertTriangle,
    })),
    ...failedAutomationEvents.map((event) => ({
      key: `automation-${event.id}`,
      label: t("digest.attention.failedAutomation"),
      detail: attentionDetail(event.error ?? event.message, event.phone_number ?? event.event_type),
      href: event.call_id ? `/${locale}/calls/${event.call_id}` : `/${locale}/activity`,
      timestamp: event.created_at,
      icon: XCircle,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

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

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{t("digest.title")}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {hasDigestActivity
                ? t("digest.summary", {
                    range: t(`digest.ranges.${activeRange}`),
                    calls: activeCalls.length,
                    leads: activeContacts.length,
                    bookings: digestBookedActive,
                    sms: digestSmsSent,
                    urgent: digestUrgentCalls.length,
                  })
                : t("digest.empty")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {DIGEST_RANGES.map((range) => (
              <Link
                key={range}
                href={`/${locale}/dashboard?digestRange=${range}`}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-muted ${
                  activeRange === range ? "bg-foreground text-background hover:bg-foreground" : ""
                }`}
              >
                {t(`digest.rangeButtons.${range}`)}
              </Link>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {digestStats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-2 text-2xl font-bold">{value}</div>
              </div>
            ))}
          </div>

          <div>
            <h2 className="text-sm font-semibold">{t("digest.attention.title")}</h2>
            {attentionItems.length === 0 ? (
              <p className="mt-2 rounded-lg border px-4 py-3 text-sm text-muted-foreground">
                {t("digest.attention.empty")}
              </p>
            ) : (
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {attentionItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className="rounded-lg border p-3 transition-colors hover:bg-muted"
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.detail}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
