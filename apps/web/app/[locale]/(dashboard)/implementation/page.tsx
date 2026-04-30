import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { Database } from "@repo/database";
import {
  Bot,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Contact,
  ExternalLink,
  MessageSquareText,
  PhoneCall,
  Settings,
  Sparkles,
  Workflow,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createContactsSupabaseClient, getCurrentOrgId } from "@/lib/contacts-server";
import { DEMO_PACKS } from "@/lib/demo-packs";
import {
  normalizeBusinessHours,
  normalizeWorkflowRecipes,
} from "@/lib/schemas/organization-settings";

type Props = {
  params: Promise<{ locale: string }>;
};

type Json = Database["public"]["Tables"]["organizations"]["Row"]["workflow_recipes"];

type OrganizationRow = Pick<
  Database["public"]["Tables"]["organizations"]["Row"],
  | "name"
  | "business_email"
  | "business_phone"
  | "website_url"
  | "timezone"
  | "business_hours"
  | "booking_enabled"
  | "calcom_api_key"
  | "calcom_event_type_id"
  | "calcom_username"
  | "sms_enabled"
  | "sms_sender_phone_number_id"
  | "sms_sender_number"
  | "sms_followup_template"
  | "workflow_recipes"
>;

type AgentRow = Pick<
  Database["public"]["Tables"]["voice_agents"]["Row"],
  "id" | "name" | "status" | "vertical" | "knowledge_base" | "system_prompt" | "first_message"
>;

type PhoneNumberRow = Pick<
  Database["public"]["Tables"]["phone_numbers"]["Row"],
  "id" | "phone_number" | "agent_id" | "is_active" | "provisioning_status"
>;

type ChecklistItem = {
  id: string;
  complete: boolean;
  title: string;
  description: string;
  href: string;
  icon: typeof Settings;
};

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: typeof Settings;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function hasKnowledgeBase(agent: AgentRow) {
  if (hasText(agent.system_prompt) || hasText(agent.first_message)) {
    return true;
  }

  if (!isRecord(agent.knowledge_base)) {
    return false;
  }

  return Object.values(agent.knowledge_base).some((value) => {
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return Boolean(value);
  });
}

function businessHoursConfigured(value: Json) {
  const hours = normalizeBusinessHours(value);
  return Object.values(hours).some((day) => day.isOpen);
}

function readinessStatus(score: number) {
  if (score >= 90) return "productionReady";
  if (score >= 70) return "demoReady";
  if (score >= 40) return "partiallyReady";
  return "notReady";
}

function inferDemoPack(agents: AgentRow[]) {
  const primaryVertical = agents.find((agent) => agent.vertical)?.vertical;
  if (!primaryVertical) {
    return DEMO_PACKS[0]!;
  }
  return DEMO_PACKS.find((pack) => pack.vertical === primaryVertical) ?? DEMO_PACKS[0]!;
}

export default async function ImplementationPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("implementation");
  const orgId = await getCurrentOrgId();

  if (!orgId) {
    redirect(`/${locale}/dashboard`);
  }

  const supabase = await createContactsSupabaseClient();
  const [
    organizationResult,
    agentsResult,
    phoneNumbersResult,
    contactsResult,
    callsResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "name, business_email, business_phone, website_url, timezone, business_hours, booking_enabled, calcom_api_key, calcom_event_type_id, calcom_username, sms_enabled, sms_sender_phone_number_id, sms_sender_number, sms_followup_template, workflow_recipes",
      )
      .eq("id", orgId)
      .single(),
    supabase
      .from("voice_agents")
      .select("id, name, status, vertical, knowledge_base, system_prompt, first_message")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true }),
    supabase
      .from("phone_numbers")
      .select("id, phone_number, agent_id, is_active, provisioning_status")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true }),
    supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("calls")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
  ]);

  if (!organizationResult.data) {
    redirect(`/${locale}/dashboard`);
  }

  const organization = organizationResult.data as OrganizationRow;
  const agents = (agentsResult.data ?? []) as AgentRow[];
  const phoneNumbers = (phoneNumbersResult.data ?? []) as PhoneNumberRow[];
  const contactCount = contactsResult.count ?? 0;
  const callCount = callsResult.count ?? 0;
  const workflowRecipes = normalizeWorkflowRecipes(organization.workflow_recipes);
  const enabledRecipeCount = Object.values(workflowRecipes).filter(Boolean).length;
  const primaryAgent = agents[0] ?? null;
  const suggestedPack = inferDemoPack(agents);

  const checklist: ChecklistItem[] = [
    {
      id: "businessProfile",
      complete:
        hasText(organization.name) &&
        hasText(organization.timezone) &&
        (hasText(organization.business_email) || hasText(organization.business_phone)),
      title: t("checklist.businessProfile.title"),
      description: t("checklist.businessProfile.description"),
      href: `/${locale}/settings`,
      icon: Settings,
    },
    {
      id: "businessHours",
      complete: businessHoursConfigured(organization.business_hours),
      title: t("checklist.businessHours.title"),
      description: t("checklist.businessHours.description"),
      href: `/${locale}/settings`,
      icon: CalendarCheck,
    },
    {
      id: "agentExists",
      complete: agents.length > 0,
      title: t("checklist.agentExists.title"),
      description: t("checklist.agentExists.description"),
      href: primaryAgent ? `/${locale}/agents/${primaryAgent.id}` : `/${locale}/agents/new`,
      icon: Bot,
    },
    {
      id: "agentKnowledge",
      complete: agents.some(hasKnowledgeBase),
      title: t("checklist.agentKnowledge.title"),
      description: t("checklist.agentKnowledge.description"),
      href: primaryAgent ? `/${locale}/agents/${primaryAgent.id}` : `/${locale}/agents/new`,
      icon: ClipboardList,
    },
    {
      id: "phoneAssigned",
      complete: phoneNumbers.some((number) => number.is_active && Boolean(number.agent_id)),
      title: t("checklist.phoneAssigned.title"),
      description: t("checklist.phoneAssigned.description"),
      href: `/${locale}/phone-numbers`,
      icon: PhoneCall,
    },
    {
      id: "bookingConfigured",
      complete:
        organization.booking_enabled &&
        hasText(organization.calcom_api_key) &&
        (hasText(organization.calcom_event_type_id) || hasText(organization.calcom_username)),
      title: t("checklist.bookingConfigured.title"),
      description: t("checklist.bookingConfigured.description"),
      href: `/${locale}/settings`,
      icon: CalendarCheck,
    },
    {
      id: "smsConfigured",
      complete:
        organization.sms_enabled &&
        (hasText(organization.sms_sender_number) ||
          hasText(organization.sms_sender_phone_number_id)) &&
        hasText(organization.sms_followup_template),
      title: t("checklist.smsConfigured.title"),
      description: t("checklist.smsConfigured.description"),
      href: `/${locale}/settings`,
      icon: MessageSquareText,
    },
    {
      id: "workflowRecipes",
      complete: enabledRecipeCount > 0,
      title: t("checklist.workflowRecipes.title"),
      description: t("checklist.workflowRecipes.description", { count: enabledRecipeCount }),
      href: `/${locale}/settings`,
      icon: Workflow,
    },
    {
      id: "contactsExist",
      complete: contactCount > 0,
      title: t("checklist.contactsExist.title"),
      description: t("checklist.contactsExist.description", { count: contactCount }),
      href: `/${locale}/contacts`,
      icon: Contact,
    },
    {
      id: "qaChecklist",
      complete: callCount > 0,
      title: t("checklist.qaChecklist.title"),
      description: t("checklist.qaChecklist.description", { count: callCount }),
      href: `/${locale}/calls`,
      icon: ClipboardCheck,
    },
  ];

  const completeCount = checklist.filter((item) => item.complete).length;
  const score = Math.round((completeCount / checklist.length) * 100);
  const status = readinessStatus(score);

  const quickActions: QuickAction[] = [
    {
      title: t("actions.settings.title"),
      description: t("actions.settings.description"),
      href: `/${locale}/settings`,
      icon: Settings,
    },
    {
      title: t("actions.agent.title"),
      description: t("actions.agent.description"),
      href: primaryAgent ? `/${locale}/agents/${primaryAgent.id}` : `/${locale}/agents/new`,
      icon: Bot,
    },
    {
      title: t("actions.phoneNumbers.title"),
      description: t("actions.phoneNumbers.description"),
      href: `/${locale}/phone-numbers`,
      icon: PhoneCall,
    },
    {
      title: t("actions.workflows.title"),
      description: t("actions.workflows.description"),
      href: `/${locale}/settings`,
      icon: Workflow,
    },
    {
      title: t("actions.tasks.title"),
      description: t("actions.tasks.description"),
      href: `/${locale}/tasks`,
      icon: ClipboardList,
    },
    {
      title: t("actions.qa.title"),
      description: t("actions.qa.description"),
      href: `/${locale}/calls`,
      icon: ClipboardCheck,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Badge variant={status === "productionReady" || status === "demoReady" ? "default" : "secondary"}>
          {t(`statuses.${status}`)}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("score.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-4xl font-bold tracking-tight">{score}%</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("score.summary", { complete: completeCount, total: checklist.length })}
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${score}%` }} />
            </div>
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("score.agent")}</span>
                <span className="font-medium">{primaryAgent?.name ?? t("emptyValue")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("score.phone")}</span>
                <span className="font-medium">
                  {phoneNumbers.find((number) => number.agent_id)?.phone_number ?? t("emptyValue")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t("score.recipes")}</span>
                <span className="font-medium">{enabledRecipeCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t("demoPack.title")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {t(`demoPack.packs.${suggestedPack.id}`)}
                </span>
                {primaryAgent?.vertical && (
                  <Badge variant="outline">
                    {t("demoPack.vertical", { vertical: primaryAgent.vertical })}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {primaryAgent
                  ? t("demoPack.detected", { agent: primaryAgent.name })
                  : t("demoPack.empty")}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
              <Button asChild size="sm">
                <Link href={`/${locale}/agents/new`}>
                  {t("demoPack.create")}
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </Button>
              {primaryAgent && (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/${locale}/agents/${primaryAgent.id}`}>
                    {t("demoPack.edit")}
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("checklistTitle")}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {checklist.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className="grid gap-3 rounded-md border p-4 transition-colors hover:bg-accent md:grid-cols-[auto_1fr_auto]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-background">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium">{item.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                </div>
                <div className="flex items-start md:justify-end">
                  {item.complete ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t("actionsTitle")}</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.href + action.title}
                asChild
                variant="outline"
                className="h-auto justify-start gap-3 p-4 text-left"
              >
                <Link href={action.href}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>
                    <span className="block font-medium">{action.title}</span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      {action.description}
                    </span>
                  </span>
                </Link>
              </Button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
