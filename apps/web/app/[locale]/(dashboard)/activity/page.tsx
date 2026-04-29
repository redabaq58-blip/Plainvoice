import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Activity, AlertCircle, CheckCircle2, Clock3, MinusCircle } from "lucide-react";
import { createContactsSupabaseClient } from "@/lib/contacts-server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  params: Promise<{ locale: string }>;
};

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
  created_at: string;
};

const STATUS_ICON = {
  success: CheckCircle2,
  failed: AlertCircle,
  skipped: MinusCircle,
  info: Clock3,
} as const;

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  success: "default",
  failed: "destructive",
  skipped: "secondary",
  info: "outline",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}

export default async function ActivityPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("activity");

  const supabase = await createContactsSupabaseClient();
  const { data } = await supabase
    .from("automation_events")
    .select("id, event_type, status, source, call_id, contact_id, phone_number, message, error, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const events = (data ?? []) as AutomationEvent[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4" />
            {t("timeline")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ol className="space-y-4">
              {events.map((event) => {
                const Icon = STATUS_ICON[event.status as keyof typeof STATUS_ICON] ?? Clock3;
                return (
                  <li key={event.id} className="flex gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1 border-b pb-4 last:border-b-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{event.message}</p>
                        <Badge variant={STATUS_VARIANT[event.status] ?? "outline"}>
                          {t(`status.${event.status}` as Parameters<typeof t>[0])}
                        </Badge>
                        <Badge variant="outline">
                          {t(`source.${event.source}` as Parameters<typeof t>[0])}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{formatDateTime(event.created_at)}</span>
                        <span>{t(`eventType.${event.event_type}` as Parameters<typeof t>[0])}</span>
                        {event.phone_number && <span>{event.phone_number}</span>}
                        {event.call_id && (
                          <Link href={`/${locale}/calls/${event.call_id}`} className="hover:underline">
                            {t("openCall")}
                          </Link>
                        )}
                        {event.contact_id && (
                          <Link href={`/${locale}/contacts/${event.contact_id}`} className="hover:underline">
                            {t("openContact")}
                          </Link>
                        )}
                      </div>
                      {event.error && (
                        <p className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                          {event.error}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
