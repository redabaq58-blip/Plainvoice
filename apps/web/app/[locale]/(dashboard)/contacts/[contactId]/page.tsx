import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Ban, ClipboardList, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContactForm } from "@/components/contacts/contact-form";
import { SmsHistoryCard, type SmsHistoryItem } from "@/components/sms/sms-history-card";
import {
  contactFromFormData,
  tagsToInput,
  toContactPayload,
  type ContactInput,
} from "@/lib/schemas/contact";
import { createContactsSupabaseClient, getCurrentOrgId } from "@/lib/contacts-server";

type Props = {
  params: Promise<{ locale: string; contactId: string }>;
};

type CallRow = {
  id: string;
  started_at: string | null;
  direction: string;
  status: string;
  duration_seconds: number | null;
  summary: string | null;
  from_number: string | null;
  to_number: string | null;
};

function formatDuration(seconds: number | null) {
  if (!seconds) return "-";
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function formatDateTime(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString();
}

function contactName(contact: { first_name: string | null; last_name: string | null }) {
  return [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "-";
}

function buildFormLabels(t: Awaited<ReturnType<typeof getTranslations>>) {
  return {
    firstName: t("form.firstName"),
    lastName: t("form.lastName"),
    phone: t("form.phone"),
    email: t("form.email"),
    company: t("form.company"),
    language: t("form.language"),
    leadScore: t("form.leadScore"),
    tags: t("form.tags"),
    tagsPlaceholder: t("form.tagsPlaceholder"),
    doNotCall: t("form.doNotCall"),
    notes: t("form.notes"),
    save: t("form.save"),
    create: t("form.create"),
    languages: {
      fr: t("languages.fr"),
      en: t("languages.en"),
    },
  };
}

export default async function ContactDetailPage({ params }: Props) {
  const { locale, contactId } = await params;
  const t = await getTranslations("contacts");
  const orgId = await getCurrentOrgId();

  if (!orgId) {
    redirect(`/${locale}/dashboard`);
  }

  const supabase = await createContactsSupabaseClient();
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("org_id", orgId)
    .eq("id", contactId)
    .single();

  if (!contact) {
    notFound();
  }
  const resolvedContact = contact;
  const nextDoNotCall = !resolvedContact.do_not_call;
  const defaultTaskTitle = t("tasks.defaultContactTitle", { name: contactName(resolvedContact) });

  const { data: callRows } = resolvedContact.phone
    ? await supabase
        .from("calls")
        .select("id, started_at, direction, status, duration_seconds, summary, from_number, to_number")
        .eq("org_id", orgId)
        .eq("from_number", resolvedContact.phone)
        .order("started_at", { ascending: false })
        .limit(25)
    : { data: [] };

  const calls = (callRows ?? []) as CallRow[];

  let smsQuery = supabase
    .from("sms_messages")
    .select("id, recipient, sender, body, status, message_type, call_id, error, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (resolvedContact.phone) {
    smsQuery = smsQuery.or(`contact_id.eq.${contactId},recipient.eq.${resolvedContact.phone}`);
  } else {
    smsQuery = smsQuery.eq("contact_id", contactId);
  }

  const { data: smsRows } = await smsQuery;
  const smsMessages = (smsRows ?? []) as SmsHistoryItem[];

  async function updateContact(formData: FormData) {
    "use server";

    const parsed = contactFromFormData(formData);
    if (!parsed.success) {
      return;
    }

    const currentOrgId = await getCurrentOrgId();
    if (!currentOrgId) {
      return;
    }

    const sb = await createContactsSupabaseClient();
    await sb
      .from("contacts")
      .update(toContactPayload(parsed.data as ContactInput))
      .eq("org_id", currentOrgId)
      .eq("id", contactId);

    redirect(`/${locale}/contacts/${contactId}`);
  }

  async function toggleDoNotCall() {
    "use server";

    const currentOrgId = await getCurrentOrgId();
    if (!currentOrgId) {
      return;
    }

    const sb = await createContactsSupabaseClient();
    await sb
      .from("contacts")
      .update({ do_not_call: nextDoNotCall })
      .eq("org_id", currentOrgId)
      .eq("id", contactId);

    redirect(`/${locale}/contacts/${contactId}`);
  }

  async function deleteContact() {
    "use server";

    const currentOrgId = await getCurrentOrgId();
    if (!currentOrgId) {
      return;
    }

    const sb = await createContactsSupabaseClient();
    await sb.from("contacts").delete().eq("org_id", currentOrgId).eq("id", contactId);
    redirect(`/${locale}/contacts`);
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
      contact_id: contactId,
      priority: "normal",
      source: "contact",
    });

    redirect(`/${locale}/tasks`);
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/${locale}/contacts`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("title")}
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{contactName(resolvedContact)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[resolvedContact.phone, resolvedContact.email, resolvedContact.company].filter(Boolean).join(" · ") || "-"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {resolvedContact.do_not_call && (
            <Badge variant="destructive" className="gap-1">
              <Ban className="h-3 w-3" />
              {t("doNotCall")}
            </Badge>
          )}
          <form action={toggleDoNotCall}>
            <Button type="submit" variant="outline" size="sm">
              {resolvedContact.do_not_call ? t("actions.markCallable") : t("actions.markDoNotCall")}
            </Button>
          </form>
          <form action={createFollowUpTask}>
            <Button type="submit" variant="outline" size="sm">
              <ClipboardList className="h-4 w-4" />
              {t("actions.createTask")}
            </Button>
          </form>
          <form action={deleteContact}>
            <Button type="submit" variant="destructive" size="sm">
              {t("actions.delete")}
            </Button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("detail.leadScore")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{resolvedContact.lead_score}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("detail.totalCalls")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{resolvedContact.total_calls}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("detail.lastCallAt")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">{formatDateTime(resolvedContact.last_call_at)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("detail.profile")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ContactForm
            action={updateContact}
            labels={buildFormLabels(t)}
            submitLabel={t("form.save")}
            defaultValues={{
              firstName: resolvedContact.first_name ?? "",
              lastName: resolvedContact.last_name ?? "",
              phone: resolvedContact.phone ?? "",
              email: resolvedContact.email ?? "",
              company: resolvedContact.company ?? "",
              languagePreference: resolvedContact.language_preference as ContactInput["languagePreference"],
              leadScore: resolvedContact.lead_score,
              tags: tagsToInput(resolvedContact.tags),
              doNotCall: resolvedContact.do_not_call,
              notes: resolvedContact.notes ?? "",
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            {t("detail.callHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {calls.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("detail.noCalls")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("calls.date")}</TableHead>
                  <TableHead>{t("calls.direction")}</TableHead>
                  <TableHead>{t("calls.duration")}</TableHead>
                  <TableHead>{t("calls.summary")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>
                      <Link
                        href={`/${locale}/calls/${call.id}`}
                        className="font-medium hover:underline"
                      >
                        {formatDateTime(call.started_at)}
                      </Link>
                    </TableCell>
                    <TableCell>{call.direction}</TableCell>
                    <TableCell>{formatDuration(call.duration_seconds)}</TableCell>
                    <TableCell className="max-w-md whitespace-normal">
                      {call.summary ?? t("calls.noSummary")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SmsHistoryCard
        locale={locale}
        messages={smsMessages}
        showCallLink
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
    </div>
  );
}
