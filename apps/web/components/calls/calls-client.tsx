"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@repo/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExternalLink, Phone, TrendingUp } from "lucide-react";
import { useParams } from "next/navigation";

type CallItem = {
  id: string;
  direction: string;
  status: string;
  sentiment: string | null;
  from_number: string | null;
  started_at: string | null;
  duration_seconds: number | null;
  credits_used: number | null;
  outcome: string | null;
  urgency: string;
  follow_up_required: boolean;
  quality_rating: string;
  agentName: string | null;
};

type Stats = {
  totalCallsThisMonth: number;
  totalMinutesThisMonth: number;
  avgDuration: string;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
    unknown: number;
  };
};

type Filters = {
  direction: string;
  sentiment: string;
  dateFrom: string;
  dateTo: string;
  phone: string;
  outcome: string;
  followUp: string;
  quality: string;
};

type Labels = {
  title: string;
  empty: { title: string; description: string };
  stats: { totalCalls: string; totalMinutes: string; avgDuration: string; sentiment: string };
  filters: {
    dateFrom: string;
    dateTo: string;
    allDirections: string;
    allSentiments: string;
    allOutcomes: string;
    followUpRequired: string;
    allFollowUp: string;
    phonePlaceholder: string;
  };
  table: {
    date: string;
    direction: string;
    from: string;
    duration: string;
    agent: string;
    sentiment: string;
    outcome: string;
    urgency: string;
    quality: string;
    actions: string;
  };
  direction: { inbound: string; outbound: string; web: string };
  sentiment: { positive: string; neutral: string; negative: string; unknown: string };
  outcome: Record<string, string>;
  urgency: Record<string, string>;
  quality: Record<string, string>;
  pagination: { previous: string; next: string; page: string };
};

type Props = {
  calls: CallItem[];
  stats: Stats;
  page: number;
  totalPages: number;
  totalCount: number;
  orgId: string;
  filters: Filters;
  labels: Labels;
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(iso: string | null, locale: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
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
  unknown: "outline",
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

const OUTCOME_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  booked_appointment: "default",
  new_lead: "default",
  existing_customer: "secondary",
  needs_follow_up: "secondary",
  emergency: "destructive",
  quote_request: "default",
  price_question: "secondary",
  complaint: "destructive",
  spam: "outline",
  wrong_number: "outline",
  no_action_needed: "outline",
};

const URGENCY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "outline",
  normal: "secondary",
  urgent: "destructive",
};

const QUALITY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  good: "default",
  okay: "secondary",
  bad: "destructive",
  unreviewed: "outline",
};

export function CallsClient({
  calls,
  stats,
  page,
  totalPages,
  orgId,
  filters,
  labels,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale } = useParams<{ locale: string }>();

  // Realtime: subscribe to new calls for this org, refresh page on INSERT
  useEffect(() => {
    if (!orgId) return;
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("calls-org-" + orgId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "calls",
          filter: `org_id=eq.${orgId}`,
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orgId, router]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all" && value !== "") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // reset to page 1 on filter change
    router.push(`${pathname}?${params.toString()}`);
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{labels.title}</h1>

      {/* Stats bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{labels.stats.totalCalls}</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCallsThisMonth}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{labels.stats.totalMinutes}</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMinutesThisMonth}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{labels.stats.avgDuration}</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgDuration}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{labels.stats.sentiment}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              <Badge variant="default" className="text-xs">
                +{stats.sentimentBreakdown.positive}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                ={stats.sentimentBreakdown.neutral}
              </Badge>
              <Badge variant="destructive" className="text-xs">
                -{stats.sentimentBreakdown.negative}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        {/* Date from */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{labels.filters.dateFrom}</span>
          <input
            type="date"
            defaultValue={filters.dateFrom}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            onChange={(e) => updateFilter("dateFrom", e.target.value)}
          />
        </div>

        {/* Date to */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{labels.filters.dateTo}</span>
          <input
            type="date"
            defaultValue={filters.dateTo}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            onChange={(e) => updateFilter("dateTo", e.target.value)}
          />
        </div>

        {/* Direction */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">&nbsp;</span>
          <Select
            defaultValue={filters.direction}
            onValueChange={(v) => updateFilter("direction", v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={labels.filters.allDirections} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{labels.filters.allDirections}</SelectItem>
              <SelectItem value="inbound">{labels.direction.inbound}</SelectItem>
              <SelectItem value="outbound">{labels.direction.outbound}</SelectItem>
              <SelectItem value="web">{labels.direction.web}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sentiment */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">&nbsp;</span>
          <Select
            defaultValue={filters.sentiment}
            onValueChange={(v) => updateFilter("sentiment", v)}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={labels.filters.allSentiments} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{labels.filters.allSentiments}</SelectItem>
              <SelectItem value="positive">{labels.sentiment.positive}</SelectItem>
              <SelectItem value="neutral">{labels.sentiment.neutral}</SelectItem>
              <SelectItem value="negative">{labels.sentiment.negative}</SelectItem>
              <SelectItem value="unknown">{labels.sentiment.unknown}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Phone search */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">&nbsp;</span>
          <Input
            placeholder={labels.filters.phonePlaceholder}
            defaultValue={filters.phone}
            className="w-[200px]"
            onChange={(e) => {
              const v = e.target.value;
              // debounce via timeout
              const timeout = setTimeout(() => updateFilter("phone", v), 400);
              return () => clearTimeout(timeout);
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">&nbsp;</span>
          <Select
            defaultValue={filters.outcome}
            onValueChange={(v) => updateFilter("outcome", v)}
          >
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder={labels.filters.allOutcomes} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{labels.filters.allOutcomes}</SelectItem>
              <SelectItem value="unknown">{labels.outcome.unknown}</SelectItem>
              {OUTCOMES.map((outcome) => (
                <SelectItem key={outcome} value={outcome}>
                  {labels.outcome[outcome]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">&nbsp;</span>
          <Select
            defaultValue={filters.followUp}
            onValueChange={(v) => updateFilter("followUp", v)}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder={labels.filters.allFollowUp} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{labels.filters.allFollowUp}</SelectItem>
              <SelectItem value="required">{labels.filters.followUpRequired}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">&nbsp;</span>
          <Select
            defaultValue={filters.quality}
            onValueChange={(v) => updateFilter("quality", v)}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder={labels.table.quality} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{labels.table.quality}</SelectItem>
              <SelectItem value="unreviewed">{labels.quality.unreviewed}</SelectItem>
              <SelectItem value="good">{labels.quality.good}</SelectItem>
              <SelectItem value="okay">{labels.quality.okay}</SelectItem>
              <SelectItem value="bad">{labels.quality.bad}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {calls.length === 0 ? (
        <div className="rounded-md border py-12 text-center">
          <p className="text-muted-foreground">{labels.empty.description}</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.table.date}</TableHead>
                <TableHead>{labels.table.direction}</TableHead>
                <TableHead>{labels.table.from}</TableHead>
                <TableHead>{labels.table.duration}</TableHead>
                <TableHead>{labels.table.agent}</TableHead>
                <TableHead>{labels.table.sentiment}</TableHead>
                <TableHead>{labels.table.outcome}</TableHead>
                <TableHead>{labels.table.urgency}</TableHead>
                <TableHead>{labels.table.quality}</TableHead>
                <TableHead className="text-right">{labels.table.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((call) => (
                <TableRow key={call.id}>
                  <TableCell className="text-sm">{formatDate(call.started_at, locale)}</TableCell>
                  <TableCell>
                    <Badge variant={DIRECTION_VARIANT[call.direction] ?? "outline"}>
                      {labels.direction[call.direction as keyof typeof labels.direction] ?? call.direction}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {call.from_number ?? "—"}
                  </TableCell>
                  <TableCell>{formatDuration(call.duration_seconds)}</TableCell>
                  <TableCell>{call.agentName ?? "—"}</TableCell>
                  <TableCell>
                    {call.sentiment ? (
                      <Badge variant={SENTIMENT_VARIANT[call.sentiment] ?? "outline"}>
                        {labels.sentiment[call.sentiment as keyof typeof labels.sentiment] ?? call.sentiment}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {call.outcome ? (
                      <Badge variant={OUTCOME_VARIANT[call.outcome] ?? "outline"}>
                        {labels.outcome[call.outcome] ?? call.outcome}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                    {call.follow_up_required && (
                      <Badge variant="outline" className="ml-1">
                        {labels.filters.followUpRequired}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={URGENCY_VARIANT[call.urgency] ?? "outline"}>
                      {labels.urgency[call.urgency] ?? call.urgency}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={QUALITY_VARIANT[call.quality_rating] ?? "outline"}>
                      {labels.quality[call.quality_rating] ?? call.quality_rating}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/${locale}/calls/${call.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            {labels.pagination.previous}
          </Button>
          <span className="text-sm text-muted-foreground">
            {labels.pagination.page}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            {labels.pagination.next}
          </Button>
        </div>
      )}
    </div>
  );
}
