import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import type { Database } from "@repo/database";
import {
  AlertTriangle,
  Check,
  ClipboardList,
  CircleAlert,
  PhoneForwarded,
  PhoneMissed,
  UserPlus,
  Webhook,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createContactsSupabaseClient, getCurrentOrgId } from "@/lib/contacts-server";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ filter?: InboxFilter }>;
};

type InboxFilter = "all" | "urgent" | "failed" | "follow-up" | "new-leads" | "transfer";
type InboxKind = "urgent" | "failed" | "follow-up" | "new-leads" | "transfer";
type ItemType = "automation_event" | "call" | "contact";
type Json = Database["public"]["Tables"]["calls"]["Row"]["sms_status"];

type AutomationEvent = {
  id: string;
  event_type: string;
  status: string;
  source: string;
  call_id: string | null;
  contact_id: string | null;
  phone_number: string | null;
  message: string;
  error: string | null;
  metadata: Json;
  created_at: string;
};

type CallRow = {
  id: string;
  booking_result: Json | null;
  duration_seconds: number | null;
  ended_reason: string | null;
  follow_up_required: boolean;
  from_number: string | null;
  issue_categories: string[];
  lead_status: string;
  outcome: string | null;
  owner_notes: string | null;
  quality_rating: string;
  review_notes: string | null;
  sentiment: string | null;
  sms_status: Json;
  started_at: string | null;
  status: string;
  summary: string | null;
  urgency: string;
  created_at: string;
};

type ContactRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company: string | null;
  created_at: string;
};

type InboxItem = {
  key: string;
  itemType: ItemType;
  id: string;
  kind: InboxKind;
  typeLabelKey: string;
  status: string;
  source: string;
  phone: string | null;
  callId: string | null;
  contactId: string | null;
  message: string;
  error: string | null;
  timestamp: string;
};

const ACTION_EVENT_TYPES = new Set([
  "booking_failed",
  "sms_failed",
  "owner_notification_skipped",
  "human_transfer_requested",
  "human_transfer_unavailable",
]);

const FILTERS: InboxFilter[] = [
  "all",
  "urgent",
  "failed",
  "follow-up",
  "new-leads",
  "transfer",
];

const KIND_ICON = {
  urgent: AlertTriangle,
  failed: CircleAlert,
  "follow-up": PhoneMissed,
  "new-leads": UserPlus,
  transfer: PhoneForwarded,
} as const;

function isRecord(value: Json | null | undefined): value is Record<string, Json | undefined> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function textIncludesAction(value: unknown) {
  const text = JSON.stringify(value ?? "").toLowerCase();
  return (
    text.includes("urgent") ||
    text.includes("emergency") ||
    text.includes("urgence") ||
    text.includes("immediate")
  );
}

function isFailedToolOrWebhook(event: AutomationEvent) {
  const text = `${event.event_type} ${event.source} ${event.message} ${event.error ?? ""}`.toLowerCase();
  return event.status === "failed" && (text.includes("tool") || text.includes("webhook"));
}

function classifyEvent(event: AutomationEvent): InboxKind | null {
  if (textIncludesAction(event.metadata) || textIncludesAction(event.message) || textIncludesAction(event.error)) {
    return "urgent";
  }
  if (event.event_type === "human_transfer_requested" || event.event_type === "human_transfer_unavailable") {
    return "transfer";
  }
  if (
    event.event_type === "booking_failed" ||
    event.event_type === "sms_failed" ||
    event.event_type === "owner_notification_skipped" ||
    event.status === "failed" ||
    event.status === "skipped" ||
    isFailedToolOrWebhook(event)
  ) {
    return "failed";
  }
  return ACTION_EVENT_TYPES.has(event.event_type) ? "follow-up" : null;
}

function hasFailedSmsStatus(call: CallRow) {
  if (!isRecord(call.sms_status)) {
    return false;
  }

  return Object.values(call.sms_status).some((value) => {
    if (!isRecord(value)) {
      return false;
    }
    return value.ok === false || value.status === "failed" || value.error != null;
  });
}

function hasFailedBooking(call: CallRow) {
  return isRecord(call.booking_result) && (call.booking_result.ok === false || call.booking_result.error != null);
}

function needsFollowUp(call: CallRow) {
  const reason = (call.ended_reason ?? "").toLowerCase();
  return (
    call.follow_up_required ||
    call.outcome === "needs_follow_up" ||
    call.lead_status === "needs_follow_up" ||
    call.status === "failed" ||
    call.status === "cancelled" ||
    reason.includes("no-answer") ||
    reason.includes("missed") ||
    call.duration_seconds === 0 ||
    call.sentiment === "negative" ||
    call.issue_categories.includes("needs_follow_up")
  );
}

function fullName(contact: ContactRow) {
  return [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.company || null;
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function dedupeAndSort(items: InboxItem[]) {
  const byKey = new Map<string, InboxItem>();
  for (const item of items) {
    if (!byKey.has(item.key)) {
      byKey.set(item.key, item);
    }
  }
  return [...byKey.values()].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export default async function InboxPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const activeFilter: InboxFilter = FILTERS.includes(sp.filter ?? "all") ? sp.filter ?? "all" : "all";
  const t = await getTranslations("inbox");
  const orgId = await getCurrentOrgId();

  if (!orgId) {
    redirect(`/${locale}/dashboard`);
  }

  async function markReviewed(formData: FormData) {
    "use server";

    const itemKey = String(formData.get("itemKey") ?? "");
    const itemType = String(formData.get("itemType") ?? "") as ItemType;
    const currentOrgId = await getCurrentOrgId();

    if (!currentOrgId || !itemKey || !["automation_event", "call", "contact"].includes(itemType)) {
      return;
    }

    const sb = await createContactsSupabaseClient();
    await sb.from("inbox_reviews").upsert(
      {
        org_id: currentOrgId,
        item_key: itemKey,
        item_type: itemType,
        reviewed_at: new Date().toISOString(),
      },
      { onConflict: "org_id,item_key" },
    );
    revalidatePath(`/${locale}/inbox`);
  }

  async function createTaskFromItem(formData: FormData) {
    "use server";

    const title = String(formData.get("title") ?? "").trim();
    const currentOrgId = await getCurrentOrgId();

    if (!currentOrgId || !title) {
      return;
    }

    const sb = await createContactsSupabaseClient();
    await sb.from("follow_up_tasks").insert({
      org_id: currentOrgId,
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      priority: String(formData.get("priority") ?? "normal"),
      contact_id: String(formData.get("contactId") ?? "").trim() || null,
      call_id: String(formData.get("callId") ?? "").trim() || null,
      source: "inbox",
      source_event_id: String(formData.get("sourceEventId") ?? "").trim() || null,
    });

    revalidatePath(`/${locale}/tasks`);
    redirect(`/${locale}/tasks`);
  }

  const supabase = await createContactsSupabaseClient();
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
  const recentLeadSince = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString();

  const [eventsResult, callsResult, contactsResult, reviewsResult] = await Promise.all([
    supabase
      .from("automation_events")
      .select("id, event_type, status, source, call_id, contact_id, phone_number, message, error, metadata, created_at")
      .eq("org_id", orgId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(150),
    supabase
      .from("calls")
      .select("id, booking_result, duration_seconds, ended_reason, follow_up_required, from_number, issue_categories, lead_status, outcome, owner_notes, quality_rating, review_notes, sentiment, sms_status, started_at, status, summary, urgency, created_at")
      .eq("org_id", orgId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("contacts")
      .select("id, first_name, last_name, phone, company, created_at")
      .eq("org_id", orgId)
      .gte("created_at", recentLeadSince)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("inbox_reviews")
      .select("item_key")
      .eq("org_id", orgId),
  ]);

  const reviewedKeys = new Set((reviewsResult.data ?? []).map((review) => review.item_key));
  const eventItems = ((eventsResult.data ?? []) as AutomationEvent[])
    .map((event): InboxItem | null => {
      const kind = classifyEvent(event);
      if (!kind) {
        return null;
      }
      return {
        key: `automation_event:${event.id}`,
        itemType: "automation_event",
        id: event.id,
        kind,
        typeLabelKey: event.event_type,
        status: event.status,
        source: event.source,
        phone: event.phone_number,
        callId: event.call_id,
        contactId: event.contact_id,
        message: event.message,
        error: event.error,
        timestamp: event.created_at,
      };
    })
    .filter((item): item is InboxItem => Boolean(item));

  const callItems = ((callsResult.data ?? []) as CallRow[]).flatMap((call): InboxItem[] => {
    const timestamp = call.started_at ?? call.created_at;
    const items: InboxItem[] = [];

    if (call.urgency === "urgent" || call.outcome === "emergency") {
      items.push({
        key: `call:${call.id}:urgent-outcome`,
        itemType: "call",
        id: call.id,
        kind: "urgent",
        typeLabelKey: "urgent_call",
        status: call.status,
        source: "system",
        phone: call.from_number,
        callId: call.id,
        contactId: null,
        message: call.owner_notes || call.summary || t("derived.urgentCall"),
        error: null,
        timestamp,
      });
    }

    if (needsFollowUp(call)) {
      items.push({
        key: `call:${call.id}:follow-up`,
        itemType: "call",
        id: call.id,
        kind: "follow-up",
        typeLabelKey: "call_follow_up",
        status: call.status,
        source: "vapi",
        phone: call.from_number,
        callId: call.id,
        contactId: null,
        message: call.owner_notes || call.summary || t("derived.callNeedsFollowUp"),
        error: call.ended_reason,
        timestamp,
      });
    }

    if (call.quality_rating === "bad") {
      items.push({
        key: `call:${call.id}:quality-bad`,
        itemType: "call",
        id: call.id,
        kind: "failed",
        typeLabelKey: "quality_bad",
        status: "failed",
        source: "system",
        phone: call.from_number,
        callId: call.id,
        contactId: null,
        message: call.review_notes || call.summary || t("derived.qualityBad"),
        error: null,
        timestamp,
      });
    }

    if (hasFailedSmsStatus(call)) {
      items.push({
        key: `call:${call.id}:sms-failed`,
        itemType: "call",
        id: call.id,
        kind: "failed",
        typeLabelKey: "sms_failed",
        status: "failed",
        source: "twilio",
        phone: call.from_number,
        callId: call.id,
        contactId: null,
        message: t("derived.smsFailed"),
        error: null,
        timestamp,
      });
    }

    if (hasFailedBooking(call)) {
      items.push({
        key: `call:${call.id}:booking-failed`,
        itemType: "call",
        id: call.id,
        kind: "failed",
        typeLabelKey: "booking_failed",
        status: "failed",
        source: "calcom",
        phone: call.from_number,
        callId: call.id,
        contactId: null,
        message: t("derived.bookingFailed"),
        error: null,
        timestamp,
      });
    }

    return items;
  });

  const contactItems = ((contactsResult.data ?? []) as ContactRow[]).map((contact): InboxItem => ({
    key: `contact:${contact.id}:new-lead`,
    itemType: "contact",
    id: contact.id,
    kind: "new-leads",
    typeLabelKey: "new_lead",
    status: "new",
    source: "system",
    phone: contact.phone,
    callId: null,
    contactId: contact.id,
    message: fullName(contact) ?? t("derived.newLead"),
    error: null,
    timestamp: contact.created_at,
  }));

  const allItems = dedupeAndSort([...eventItems, ...callItems, ...contactItems]).filter(
    (item) => !reviewedKeys.has(item.key),
  );
  const visibleItems =
    activeFilter === "all" ? allItems : allItems.filter((item) => item.kind === activeFilter);

  const counts = FILTERS.reduce(
    (acc, filter) => {
      acc[filter] = filter === "all" ? allItems.length : allItems.filter((item) => item.kind === filter).length;
      return acc;
    },
    {} as Record<InboxFilter, number>,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Card className="sm:min-w-44">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{allItems.length}</div>
            <p className="text-xs text-muted-foreground">{t("openItems")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Button
            key={filter}
            asChild
            size="sm"
            variant={activeFilter === filter ? "default" : "outline"}
          >
            <Link href={`/${locale}/inbox${filter === "all" ? "" : `?filter=${filter}`}`}>
              {t(`filters.${filter}` as Parameters<typeof t>[0])}
              <span className="ml-1 text-xs opacity-75">{counts[filter]}</span>
            </Link>
          </Button>
        ))}
      </div>

      {visibleItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="font-semibold">{t("empty.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("empty.description")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <Card key={item.key}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <CardTitle className="flex min-w-0 items-start gap-3 text-base">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate">{item.message}</span>
                        <span className="mt-1 flex flex-wrap gap-2 text-xs font-normal text-muted-foreground">
                          <span>{formatDateTime(item.timestamp, locale)}</span>
                          {item.phone && <span>{item.phone}</span>}
                        </span>
                      </span>
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={item.kind === "urgent" || item.kind === "failed" ? "destructive" : "secondary"}>
                        {t(`kind.${item.kind}` as Parameters<typeof t>[0])}
                      </Badge>
                      <Badge variant="outline">
                        {t(`status.${item.status}` as Parameters<typeof t>[0])}
                      </Badge>
                      <Badge variant="outline">
                        {t(`source.${item.source}` as Parameters<typeof t>[0])}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <dl className="grid gap-3 text-sm md:grid-cols-3">
                    <div>
                      <dt className="text-xs text-muted-foreground">{t("fields.type")}</dt>
                      <dd>{t(`type.${item.typeLabelKey}` as Parameters<typeof t>[0])}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">{t("fields.status")}</dt>
                      <dd>{item.status}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">{t("fields.source")}</dt>
                      <dd>{item.source}</dd>
                    </div>
                  </dl>

                  {item.error && (
                    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {item.error}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {item.callId && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/${locale}/calls/${item.callId}`}>
                          <PhoneMissed className="h-4 w-4" />
                          {t("actions.openCall")}
                        </Link>
                      </Button>
                    )}
                    {item.contactId && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/${locale}/contacts/${item.contactId}`}>
                          <UserPlus className="h-4 w-4" />
                          {t("actions.openContact")}
                        </Link>
                      </Button>
                    )}
                    {item.itemType === "automation_event" && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/${locale}/activity?event=${item.id}`}>
                          <Webhook className="h-4 w-4" />
                          {t("actions.openActivity")}
                        </Link>
                      </Button>
                    )}
                    <form action={createTaskFromItem}>
                      <input type="hidden" name="title" value={item.message} />
                      <input type="hidden" name="description" value={item.error ?? ""} />
                      <input
                        type="hidden"
                        name="priority"
                        value={item.kind === "urgent" ? "urgent" : item.kind === "failed" ? "high" : "normal"}
                      />
                      <input type="hidden" name="contactId" value={item.contactId ?? ""} />
                      <input type="hidden" name="callId" value={item.callId ?? ""} />
                      <input type="hidden" name="sourceEventId" value={item.itemType === "automation_event" ? item.id : ""} />
                      <Button type="submit" variant="outline" size="sm">
                        <ClipboardList className="h-4 w-4" />
                        {t("actions.createTask")}
                      </Button>
                    </form>
                    <form action={markReviewed}>
                      <input type="hidden" name="itemKey" value={item.key} />
                      <input type="hidden" name="itemType" value={item.itemType} />
                      <Button type="submit" size="sm">
                        <Check className="h-4 w-4" />
                        {t("actions.markDone")}
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
