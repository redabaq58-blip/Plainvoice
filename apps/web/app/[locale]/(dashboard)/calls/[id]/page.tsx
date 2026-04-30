import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { createContactsSupabaseClient, getCurrentOrgId } from "@/lib/contacts-server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CallTranscript } from "@/components/calls/call-transcript";
import { CallRecording } from "@/components/calls/call-recording";
import { SmsHistoryCard, type SmsHistoryItem } from "@/components/sms/sms-history-card";
import { Activity, Phone, User, Clock, ArrowLeft, ClipboardList } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

type TranscriptEntry = {
  role: string;
  content: string;
};

type AutomationEvent = {
  id: string;
  event_type: string;
  status: string;
  source: string;
  message: string;
  error: string | null;
  created_at: string;
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

const DIRECTION_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  inbound: "default",
  outbound: "secondary",
  web: "outline",
};

const SENTIMENT_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  positive: "default",
  neutral: "secondary",
  negative: "destructive",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  "in-progress": "secondary",
  failed: "destructive",
  cancelled: "outline",
  success: "default",
  skipped: "secondary",
  info: "outline",
};

const OUTCOMES = [
  "booked_appointment",
  "new_lead",
  "existing_customer",
  "needs_follow_up",
  "emergency",
  "quote_request",
  "price_question",
  "complaint",
  "spam",
  "wrong_number",
  "no_action_needed",
] as const;

const LEAD_STATUSES = [
  "none",
  "new",
  "qualified",
  "unqualified",
  "existing_customer",
  "needs_follow_up",
] as const;

const URGENCIES = ["low", "normal", "urgent"] as const;

function nullableFormValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

export default async function CallDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations("calls");
  const supabase = await createContactsSupabaseClient();

  // Fetch call with agent name
  const { data: call } = await supabase
    .from("calls")
    .select("*, voice_agents(name)")
    .eq("id", id)
    .single();

  if (!call) notFound();
  // Non-null assertion: notFound() throws so TypeScript still sees call as possibly null in closures
  const resolvedCall = call;

  const agentName =
    call.voice_agents && !Array.isArray(call.voice_agents)
      ? call.voice_agents.name
      : null;

  const { data: eventRows } = await supabase
    .from("automation_events")
    .select("id, event_type, status, source, message, error, created_at")
    .eq("call_id", id)
    .order("created_at", { ascending: true })
    .limit(20);
  const events = (eventRows ?? []) as AutomationEvent[];

  const { data: smsRows } = await supabase
    .from("sms_messages")
    .select("id, recipient, sender, body, status, message_type, call_id, error, created_at")
    .eq("call_id", id)
    .order("created_at", { ascending: false })
    .limit(50);
  const smsMessages = (smsRows ?? []) as SmsHistoryItem[];

  // Fetch linked contact by from_number
  const contact =
    call.from_number
      ? await supabase
          .from("contacts")
          .select("id, first_name, last_name, email, total_calls")
          .eq("phone", call.from_number)
          .maybeSingle()
          .then(({ data }) => data)
      : null;
  const defaultTaskTitle = t("tasks.defaultCallTitle", {
    phone: resolvedCall.from_number ?? t("tasks.unknownCaller"),
  });
  const defaultTaskDescription = [
    resolvedCall.summary,
    resolvedCall.outcome
      ? `${t("outcomeReview.outcome")}: ${t(`outcome.${resolvedCall.outcome}` as Parameters<typeof t>[0])}`
      : null,
    resolvedCall.lead_status && resolvedCall.lead_status !== "none"
      ? `${t("outcomeReview.leadStatus")}: ${t(`leadStatus.${resolvedCall.lead_status}` as Parameters<typeof t>[0])}`
      : null,
    `${t("outcomeReview.urgency")}: ${t(`urgency.${resolvedCall.urgency ?? "normal"}` as Parameters<typeof t>[0])}`,
    resolvedCall.owner_notes ? `${t("outcomeReview.ownerNotes")}: ${resolvedCall.owner_notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  // Server action: add caller as contact
  async function addContact() {
    "use server";
    const sb = await createSupabaseServerClient();
    const { data: member } = await sb
      .from("organization_members")
      .select("org_id")
      .limit(1)
      .single();
    if (!member || !resolvedCall.from_number) return;
    const { data: created } = await sb
      .from("contacts")
      .insert({
        org_id: member.org_id,
        phone: resolvedCall.from_number,
      })
      .select("id")
      .single();
    if (created?.id) {
      await sb.from("automation_events").insert({
        org_id: member.org_id,
        event_type: "contact_created",
        status: "success",
        source: "system",
        call_id: resolvedCall.id,
        contact_id: created.id,
        agent_id: resolvedCall.agent_id,
        phone_number: resolvedCall.from_number,
        message: `Contact created for ${resolvedCall.from_number}.`,
        metadata: { source_page: "call_detail" },
      });
    }
    redirect(`/${locale}/calls/${id}`);
  }

  async function createFollowUpTask() {
    "use server";

    const currentOrgId = await getCurrentOrgId();
    if (!currentOrgId) {
      return;
    }

    const sb = await createContactsSupabaseClient();
    await sb.from("follow_up_tasks").insert({
      org_id: currentOrgId,
      title: defaultTaskTitle,
      description: defaultTaskDescription || null,
      call_id: resolvedCall.id,
      contact_id: contact?.id ?? null,
      agent_id: resolvedCall.agent_id,
      priority:
        resolvedCall.urgency === "urgent" || resolvedCall.outcome === "emergency"
          ? "urgent"
          : resolvedCall.sentiment === "negative" || resolvedCall.status === "failed"
            ? "high"
            : "normal",
      source: "call",
    });

    redirect(`/${locale}/tasks`);
  }

  async function updateCallOutcome(formData: FormData) {
    "use server";

    const currentOrgId = await getCurrentOrgId();
    const outcome = nullableFormValue(formData, "outcome");
    const leadStatus = nullableFormValue(formData, "leadStatus") ?? "none";
    const urgency = nullableFormValue(formData, "urgency") ?? "normal";

    if (
      !currentOrgId ||
      (outcome && !OUTCOMES.includes(outcome as (typeof OUTCOMES)[number])) ||
      !LEAD_STATUSES.includes(leadStatus as (typeof LEAD_STATUSES)[number]) ||
      !URGENCIES.includes(urgency as (typeof URGENCIES)[number])
    ) {
      return;
    }

    const followUpRequired = formData.get("followUpRequired") === "on";
    const ownerNotes = nullableFormValue(formData, "ownerNotes");
    const reviewedAt = new Date().toISOString();
    const sb = await createContactsSupabaseClient();

    await sb
      .from("calls")
      .update({
        outcome,
        lead_status: leadStatus,
        urgency,
        follow_up_required: followUpRequired,
        owner_notes: ownerNotes,
        reviewed_at: reviewedAt,
      })
      .eq("org_id", currentOrgId)
      .eq("id", resolvedCall.id);

    await sb.from("automation_events").insert({
      org_id: currentOrgId,
      event_type: "call_outcome_updated",
      status: "success",
      source: "system",
      call_id: resolvedCall.id,
      contact_id: contact?.id ?? null,
      agent_id: resolvedCall.agent_id,
      phone_number: resolvedCall.from_number,
      message: `Call outcome updated to ${outcome ?? "unclassified"}.`,
      metadata: {
        outcome,
        lead_status: leadStatus,
        urgency,
        follow_up_required: followUpRequired,
      },
    });

    revalidatePath(`/${locale}/calls/${id}`);
    revalidatePath(`/${locale}/calls`);
    revalidatePath(`/${locale}/dashboard`);
    revalidatePath(`/${locale}/inbox`);
  }

  const transcript = Array.isArray(call.transcript)
    ? (call.transcript as TranscriptEntry[])
    : null;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/${locale}/calls`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("title")}
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          {formatDateTime(call.started_at)}
        </h1>
        <Badge variant={DIRECTION_VARIANT[call.direction] ?? "outline"}>
          {t(`direction.${call.direction}` as Parameters<typeof t>[0])}
        </Badge>
        <Badge variant={STATUS_VARIANT[call.status] ?? "outline"}>
          {t(`status.${call.status}` as Parameters<typeof t>[0])}
        </Badge>
        {call.sentiment && (
          <Badge variant={SENTIMENT_VARIANT[call.sentiment] ?? "outline"}>
            {t(`sentiment.${call.sentiment}` as Parameters<typeof t>[0])}
          </Badge>
        )}
        <form action={createFollowUpTask}>
          <Button type="submit" variant="outline" size="sm">
            <ClipboardList className="h-4 w-4" />
            {t("tasks.createTask")}
          </Button>
        </form>
      </div>

      {/* Metadata grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("detail.caller")}</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-mono text-sm">{call.from_number ?? "—"}</div>
            {call.to_number && (
              <div className="mt-1 text-xs text-muted-foreground">
                {t("detail.to")}: {call.to_number}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("detail.agent")}</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">{agentName ?? "—"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("detail.duration")}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm">{formatDuration(call.duration_seconds)}</div>
            {call.ended_reason && (
              <div className="mt-1 text-xs text-muted-foreground">
                {t("detail.endedReason")}: {call.ended_reason}
              </div>
            )}
            {call.credits_used != null && (
              <div className="text-xs text-muted-foreground">
                {t("detail.credits")}: {call.credits_used}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("detail.summary")}</CardTitle>
        </CardHeader>
        <CardContent>
          {call.summary ? (
            <p className="text-sm leading-relaxed">{call.summary}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{t("detail.noSummary")}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("outcomeReview.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateCallOutcome} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              {t("outcomeReview.outcome")}
              <select
                name="outcome"
                defaultValue={call.outcome ?? ""}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">{t("outcome.unknown")}</option>
                {OUTCOMES.map((outcome) => (
                  <option key={outcome} value={outcome}>
                    {t(`outcome.${outcome}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">
              {t("outcomeReview.leadStatus")}
              <select
                name="leadStatus"
                defaultValue={call.lead_status ?? "none"}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                {LEAD_STATUSES.map((leadStatus) => (
                  <option key={leadStatus} value={leadStatus}>
                    {t(`leadStatus.${leadStatus}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium">
              {t("outcomeReview.urgency")}
              <select
                name="urgency"
                defaultValue={call.urgency ?? "normal"}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                {URGENCIES.map((urgency) => (
                  <option key={urgency} value={urgency}>
                    {t(`urgency.${urgency}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-medium md:col-span-2">
              <input
                type="checkbox"
                name="followUpRequired"
                defaultChecked={Boolean(call.follow_up_required)}
                className="h-4 w-4 rounded border"
              />
              {t("outcomeReview.followUpRequired")}
            </label>
            <label className="space-y-2 text-sm font-medium md:col-span-2">
              {t("outcomeReview.ownerNotes")}
              <textarea
                name="ownerNotes"
                defaultValue={call.owner_notes ?? ""}
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </label>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button type="submit">{t("outcomeReview.save")}</Button>
              {call.follow_up_required && (
                <Button type="submit" formAction={createFollowUpTask} variant="outline">
                  <ClipboardList className="h-4 w-4" />
                  {t("tasks.createTask")}
                </Button>
              )}
            </div>
            {call.reviewed_at && (
              <p className="text-xs text-muted-foreground md:col-span-2">
                {t("outcomeReview.reviewedAt", { date: formatDateTime(call.reviewed_at) })}
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {call.handoff_requested && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("handoff.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={call.handoff_status === "unavailable" ? "secondary" : "default"}>
                {t(`handoff.status.${call.handoff_status ?? "requested"}` as Parameters<typeof t>[0])}
              </Badge>
              <span className="text-sm text-muted-foreground">{t("handoff.requested")}</span>
            </div>
            {call.handoff_notes && (
              <p className="text-sm leading-relaxed">{call.handoff_notes}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/${locale}/tasks`}>{t("handoff.openTasks")}</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/${locale}/activity`}>{t("handoff.openActivity")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t("detail.contact")}</CardTitle>
        </CardHeader>
        <CardContent>
          {contact ? (
            <div className="space-y-1 text-sm">
              <div className="font-medium">
                {[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—"}
              </div>
              <div className="text-muted-foreground">
                {t("detail.email")}: {contact.email ?? "—"}
              </div>
              <div className="text-muted-foreground">
                {t("detail.previousCalls")}: {contact.total_calls}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">{t("detail.noContact")}</p>
              {call.from_number && (
                <form action={addContact}>
                  <Button type="submit" variant="outline" size="sm">
                    {t("detail.addContact")}
                  </Button>
                </form>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4" />
            {t("detail.activity")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("detail.noActivity")}</p>
          ) : (
            <ol className="space-y-3">
              {events.map((event) => (
                <li key={event.id} className="border-l pl-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{event.message}</p>
                    <Badge variant={STATUS_VARIANT[event.status] ?? "outline"}>
                      {t(`activityStatus.${event.status}` as Parameters<typeof t>[0])}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(event.created_at)} -{" "}
                    {t(`activityType.${event.event_type}` as Parameters<typeof t>[0])}
                  </p>
                  {event.error && (
                    <p className="mt-1 text-xs text-destructive">{event.error}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <SmsHistoryCard
        locale={locale}
        messages={smsMessages}
        labels={{
          title: t("smsHistory.title"),
          empty: t("smsHistory.empty"),
          timestamp: t("smsHistory.timestamp"),
          recipient: t("smsHistory.recipient"),
          sender: t("smsHistory.sender"),
          type: t("smsHistory.type"),
          status: t("smsHistory.status"),
          body: t("smsHistory.body"),
          error: t("smsHistory.error"),
          openCall: t("smsHistory.openCall"),
          statusLabels: {
            sent: t("smsHistory.statuses.sent"),
            failed: t("smsHistory.statuses.failed"),
            skipped: t("smsHistory.statuses.skipped"),
          },
          typeLabels: {
            follow_up: t("smsHistory.types.follow_up"),
            owner_notification: t("smsHistory.types.owner_notification"),
            booking_confirmation: t("smsHistory.types.booking_confirmation"),
          },
        }}
      />

      {/* Recording */}
      <CallRecording
        recordingUrl={call.recording_url}
        labels={{
          recording: t("detail.recording"),
          noRecording: t("detail.noRecording"),
          download: t("detail.download"),
        }}
      />

      {/* Transcript */}
      <CallTranscript
        transcript={transcript}
        labels={{
          transcript: t("detail.transcript"),
          noTranscript: t("detail.noTranscript"),
        }}
      />
    </div>
  );
}
