import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Phone, Bot, Coins, Clock } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: Props) {
  await params;
  const t = await getTranslations("dashboard");

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let orgName = "";
  let orgId = "";
  if (user) {
    const { data: member } = await supabase
      .from("organization_members")
      .select("org_id, organizations(name, credits_balance, voice_minutes_used)")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (member?.organizations && !Array.isArray(member.organizations)) {
      orgName = member.organizations.name;
      orgId = member.org_id;
    }
  }

  // Fetch real stats in parallel
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [activeAgentsResult, monthCallsResult, orgResult] = await Promise.all([
    supabase
      .from("voice_agents")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("calls")
      .select("duration_seconds")
      .gte("started_at", monthStart),
    orgId
      ? supabase
          .from("organizations")
          .select("credits_balance, voice_minutes_used")
          .eq("id", orgId)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const activeAgentCount = activeAgentsResult.count ?? 0;
  const monthCalls = monthCallsResult.data ?? [];
  const totalCallsThisMonth = monthCalls.length;
  const totalMinutesThisMonth = Math.round(
    monthCalls.reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0) / 60,
  );
  const creditsBalance = orgResult.data?.credits_balance ?? 0;

  const stats = [
    { label: t("totalCalls"), value: String(totalCallsThisMonth), icon: Phone },
    { label: t("activeAgents"), value: String(activeAgentCount), icon: Bot },
    { label: t("creditsRemaining"), value: String(creditsBalance), icon: Coins },
    { label: t("thisMonthMinutes"), value: `${totalMinutesThisMonth} min`, icon: Clock },
  ] as const;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">
        {t("welcome", { org: orgName })}
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
}
