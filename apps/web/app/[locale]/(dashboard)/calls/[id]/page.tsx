import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CallTranscript } from "@/components/calls/call-transcript";
import { CallRecording } from "@/components/calls/call-recording";
import { Phone, User, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

type TranscriptEntry = {
  role: string;
  content: string;
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
};

export default async function CallDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations("calls");
  const supabase = await createSupabaseServerClient();

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
    await sb.from("contacts").insert({
      org_id: member.org_id,
      phone: resolvedCall.from_number,
    });
    redirect(`/${locale}/calls/${id}`);
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
