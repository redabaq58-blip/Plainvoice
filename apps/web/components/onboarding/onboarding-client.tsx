"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bot,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageSquareText,
  PhoneCall,
  Save,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import {
  DAYS,
  organizationSettingsSchema,
  type BusinessHours,
  type OrganizationSettingsInput,
} from "@/lib/schemas/organization-settings";
import {
  defaultKnowledgeBase,
  fromApiResponse,
  LANGUAGES,
  toApiPayload,
  type VoiceAgentCreateInput,
} from "@/lib/schemas/voice-agent";

type SaveResult = {
  ok: boolean;
  message: string | null;
};

type OnboardingAgent = {
  id: string;
  name: string;
  language: string;
  voice_provider: string;
  voice_id: string | null;
  first_message: string | null;
  system_prompt: string | null;
  transfer_phone_number: string | null;
  max_call_duration_minutes: number;
  status: string;
  vertical: string;
  knowledge_base: unknown;
  vapi_assistant_id?: string | null;
};

type PhoneNumber = {
  id: string;
  phone_number: string;
  agent_id: string | null;
  agent_name: string | null;
  provisioning_status: "active" | "vapi_error";
};

type Labels = {
  title: string;
  subtitle: string;
  loading: string;
  saving: string;
  saved: string;
  saveStep: string;
  next: string;
  back: string;
  complete: string;
  completed: string;
  incomplete: string;
  optional: string;
  error: string;
  steps: string[];
  profile: {
    title: string;
    description: string;
    businessName: string;
    email: string;
    phone: string;
    website: string;
    timezone: string;
  };
  hours: {
    title: string;
    description: string;
    open: string;
    closed: string;
    openTime: string;
    closeTime: string;
    days: Record<(typeof DAYS)[number], string>;
  };
  agent: {
    title: string;
    description: string;
    existing: string;
    create: string;
    name: string;
    language: string;
    firstMessage: string;
    businessDescription: string;
    servicesOffered: string;
    serviceArea: string;
    policies: string;
    languageLabels: Record<(typeof LANGUAGES)[number], string>;
  };
  phone: {
    title: string;
    description: string;
    noNumbers: string;
    manageNumbers: string;
    assignedTo: string;
    unassigned: string;
    active: string;
    vapiError: string;
  };
  integrations: {
    title: string;
    description: string;
    calcom: string;
    sms: string;
    enabled: string;
    disabled: string;
    settingsReady: string;
    settingsMissing: string;
    openSettings: string;
  };
  test: {
    title: string;
    description: string;
    profile: string;
    hours: string;
    agent: string;
    phone: string;
    integrations: string;
    testAgent: string;
    openDashboard: string;
  };
};

type Props = {
  locale: string;
  initialSettings: OrganizationSettingsInput;
  labels: Labels;
  saveSettings: (input: OrganizationSettingsInput) => Promise<SaveResult>;
};

function updateBusinessDay(
  hours: BusinessHours,
  day: (typeof DAYS)[number],
  next: Partial<BusinessHours[(typeof DAYS)[number]]>,
): BusinessHours {
  return {
    ...hours,
    [day]: {
      ...hours[day],
      ...next,
    },
  };
}

function emptyAgent(locale: string, settings: OrganizationSettingsInput): VoiceAgentCreateInput {
  const language =
    settings.defaultLanguage === "bilingual" || settings.defaultLanguage === "en"
      ? settings.defaultLanguage
      : locale === "en"
        ? "en"
        : "fr";

  return {
    name: "",
    vertical: "general",
    language,
    voiceProvider: settings.defaultVoiceProvider,
    voiceId: settings.defaultVoiceId,
    firstMessage: "",
    systemPrompt: "",
    transferPhoneNumber: settings.businessPhone,
    maxCallDurationMinutes: settings.defaultMaxCallDurationMinutes,
    status: "draft",
    knowledgeBase: {
      ...defaultKnowledgeBase,
      businessDescription: "",
      serviceArea: settings.websiteUrl,
    },
  };
}

function completionClass(done: boolean) {
  return done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground";
}

export function OnboardingClient({ locale, initialSettings, labels, saveSettings }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [settings, setSettings] = useState(initialSettings);
  const [agents, setAgents] = useState<OnboardingAgent[]>([]);
  const [agentValues, setAgentValues] = useState<VoiceAgentCreateInput>(
    emptyAgent(locale, initialSettings),
  );
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  const firstAgent = agents[0];

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      try {
        const [agentRows, numberRows] = await Promise.all([
          apiFetch<OnboardingAgent[]>("/api/voice-agents"),
          apiFetch<PhoneNumber[]>("/api/phone-numbers"),
        ]);
        if (cancelled) return;
        setAgents(agentRows);
        setPhoneNumbers(numberRows);
        if (agentRows[0]) {
          setAgentValues(fromApiResponse(agentRows[0] as unknown as Record<string, unknown>));
        }
      } catch (error) {
        if (!cancelled) {
          setIsError(true);
          setMessage(error instanceof Error ? error.message : labels.error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [labels.error]);

  const completion = useMemo(() => {
    const profile =
      settings.name.trim().length > 0 &&
      settings.businessEmail.trim().length > 0 &&
      settings.businessPhone.trim().length > 0 &&
      settings.timezone.trim().length > 0;
    const hours = DAYS.some((day) => settings.businessHours[day].isOpen);
    const firstMessageReady = (agentValues.firstMessage?.trim().length ?? 0) > 0;
    const agent =
      agentValues.name.trim().length > 0 &&
      agentValues.language.trim().length > 0 &&
      (Boolean(firstAgent) || firstMessageReady);
    const phone = phoneNumbers.some((number) => Boolean(number.agent_id));
    const integrations =
      (settings.bookingEnabled &&
        settings.calcomApiKey.trim().length > 0 &&
        settings.calcomEventTypeId.trim().length > 0) ||
      (settings.smsEnabled && settings.smsSenderNumber.trim().length > 0);

    return { profile, hours, agent, phone, integrations };
  }, [agentValues, firstAgent, phoneNumbers, settings]);

  const completedCount = Object.values(completion).filter(Boolean).length;
  const stepCompletion = [
    completion.profile,
    completion.hours,
    completion.agent,
    completion.phone,
    completion.integrations,
    completedCount === 5,
  ];

  function saveCurrentSettings(onSaved?: () => void) {
    const parsed = organizationSettingsSchema.safeParse(settings);
    if (!parsed.success) {
      setIsError(true);
      setMessage(labels.error);
      return;
    }

    setMessage(null);
    setIsError(false);
    startTransition(async () => {
      const result = await saveSettings(parsed.data);
      setIsError(!result.ok);
      setMessage(result.ok ? labels.saved : result.message ?? labels.error);
      if (result.ok) onSaved?.();
    });
  }

  async function saveAgent(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setMessage(null);
    setIsError(false);

    const payload = toApiPayload(agentValues);

    try {
      if (firstAgent) {
        await apiFetch(`/api/voice-agents/${firstAgent.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        const created = await apiFetch<OnboardingAgent>("/api/voice-agents", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setAgents([created]);
      }
      setMessage(labels.saved);
      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : labels.error);
    }
  }

  async function assignNumber(phoneNumberId: string, agentId: string) {
    setMessage(null);
    setIsError(false);
    try {
      const updated = await apiFetch<PhoneNumber>(`/api/phone-numbers/${phoneNumberId}/assignment`, {
        method: "PATCH",
        body: JSON.stringify({ agent_id: agentId === "unassigned" ? null : agentId }),
      });
      setPhoneNumbers((current) =>
        current.map((number) => (number.id === updated.id ? updated : number)),
      );
      setMessage(labels.saved);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : labels.error);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">{labels.loading}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{labels.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{labels.subtitle}</p>
        </div>
        <Badge variant="secondary">
          {completedCount}/5 {labels.completed}
        </Badge>
      </div>

      {message ? (
        <Alert variant={isError ? "destructive" : "default"}>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit">
          <CardContent className="flex flex-col gap-2 p-3">
            {labels.steps.map((label, index) => (
              <Button
                key={label}
                type="button"
                variant={step === index ? "secondary" : "ghost"}
                className="justify-start gap-3"
                onClick={() => setStep(index)}
              >
                <span className={`flex size-6 items-center justify-center rounded-full text-xs ${completionClass(stepCompletion[index] ?? false)}`}>
                  {index + 1}
                </span>
                {label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          {step === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{labels.profile.title}</CardTitle>
                <CardDescription>{labels.profile.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="business-name">{labels.profile.businessName}</Label>
                  <Input
                    id="business-name"
                    value={settings.name}
                    onChange={(event) =>
                      setSettings((current) => ({ ...current, name: event.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="business-email">{labels.profile.email}</Label>
                  <Input
                    id="business-email"
                    type="email"
                    value={settings.businessEmail}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        businessEmail: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="business-phone">{labels.profile.phone}</Label>
                  <Input
                    id="business-phone"
                    type="tel"
                    value={settings.businessPhone}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        businessPhone: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="business-website">{labels.profile.website}</Label>
                  <Input
                    id="business-website"
                    type="url"
                    value={settings.websiteUrl}
                    onChange={(event) =>
                      setSettings((current) => ({ ...current, websiteUrl: event.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <Label htmlFor="business-timezone">{labels.profile.timezone}</Label>
                  <Input
                    id="business-timezone"
                    value={settings.timezone}
                    onChange={(event) =>
                      setSettings((current) => ({ ...current, timezone: event.target.value }))
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 1 ? (
            <Card>
              <CardHeader>
                <CardTitle>{labels.hours.title}</CardTitle>
                <CardDescription>{labels.hours.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {DAYS.map((day) => {
                  const dayValues = settings.businessHours[day];
                  return (
                    <div
                      key={day}
                      className="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(120px,1fr)_130px_1fr_1fr]"
                    >
                      <div className="flex items-center gap-2 font-medium">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {labels.hours.days[day]}
                      </div>
                      <Select
                        value={dayValues.isOpen ? "open" : "closed"}
                        onValueChange={(value) =>
                          setSettings((current) => ({
                            ...current,
                            businessHours: updateBusinessDay(current.businessHours, day, {
                              isOpen: value === "open",
                            }),
                          }))
                        }
                      >
                        <SelectTrigger aria-label={labels.hours.days[day]}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">{labels.hours.open}</SelectItem>
                          <SelectItem value="closed">{labels.hours.closed}</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex flex-col gap-1">
                        <Label htmlFor={`${day}-open`} className="text-xs">
                          {labels.hours.openTime}
                        </Label>
                        <Input
                          id={`${day}-open`}
                          value={dayValues.openTime}
                          disabled={!dayValues.isOpen}
                          onChange={(event) =>
                            setSettings((current) => ({
                              ...current,
                              businessHours: updateBusinessDay(current.businessHours, day, {
                                openTime: event.target.value,
                              }),
                            }))
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label htmlFor={`${day}-close`} className="text-xs">
                          {labels.hours.closeTime}
                        </Label>
                        <Input
                          id={`${day}-close`}
                          value={dayValues.closeTime}
                          disabled={!dayValues.isOpen}
                          onChange={(event) =>
                            setSettings((current) => ({
                              ...current,
                              businessHours: updateBusinessDay(current.businessHours, day, {
                                closeTime: event.target.value,
                              }),
                            }))
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}

          {step === 2 ? (
            <Card>
              <CardHeader>
                <CardTitle>{labels.agent.title}</CardTitle>
                <CardDescription>
                  {firstAgent ? labels.agent.existing : labels.agent.create}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void saveAgent(event)}>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="agent-name">{labels.agent.name}</Label>
                    <Input
                      id="agent-name"
                      value={agentValues.name}
                      onChange={(event) =>
                        setAgentValues((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>{labels.agent.language}</Label>
                    <Select
                      value={agentValues.language}
                      onValueChange={(value) =>
                        setAgentValues((current) => ({
                          ...current,
                          language: value as VoiceAgentCreateInput["language"],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((language) => (
                          <SelectItem key={language} value={language}>
                            {labels.agent.languageLabels[language]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <Label htmlFor="first-message">{labels.agent.firstMessage}</Label>
                    <Textarea
                      id="first-message"
                      rows={3}
                      value={agentValues.firstMessage ?? ""}
                      onChange={(event) =>
                        setAgentValues((current) => ({
                          ...current,
                          firstMessage: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <Label htmlFor="business-description">{labels.agent.businessDescription}</Label>
                    <Textarea
                      id="business-description"
                      rows={3}
                      value={agentValues.knowledgeBase.businessDescription ?? ""}
                      onChange={(event) =>
                        setAgentValues((current) => ({
                          ...current,
                          knowledgeBase: {
                            ...current.knowledgeBase,
                            businessDescription: event.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="services-offered">{labels.agent.servicesOffered}</Label>
                    <Textarea
                      id="services-offered"
                      rows={4}
                      value={agentValues.knowledgeBase.servicesOffered ?? ""}
                      onChange={(event) =>
                        setAgentValues((current) => ({
                          ...current,
                          knowledgeBase: {
                            ...current.knowledgeBase,
                            servicesOffered: event.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="service-area">{labels.agent.serviceArea}</Label>
                    <Textarea
                      id="service-area"
                      rows={4}
                      value={agentValues.knowledgeBase.serviceArea ?? ""}
                      onChange={(event) =>
                        setAgentValues((current) => ({
                          ...current,
                          knowledgeBase: {
                            ...current.knowledgeBase,
                            serviceArea: event.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <Label htmlFor="policies">{labels.agent.policies}</Label>
                    <Textarea
                      id="policies"
                      rows={3}
                      value={agentValues.knowledgeBase.policies ?? ""}
                      onChange={(event) =>
                        setAgentValues((current) => ({
                          ...current,
                          knowledgeBase: {
                            ...current.knowledgeBase,
                            policies: event.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Button type="submit" disabled={isPending}>
                      <Save className="mr-2 h-4 w-4" />
                      {labels.saveStep}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {step === 3 ? (
            <Card>
              <CardHeader>
                <CardTitle>{labels.phone.title}</CardTitle>
                <CardDescription>{labels.phone.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {phoneNumbers.length === 0 ? (
                  <div className="flex flex-col gap-3 rounded-md border p-4">
                    <p className="text-sm text-muted-foreground">{labels.phone.noNumbers}</p>
                    <Button asChild className="w-fit">
                      <Link href={`/${locale}/phone-numbers`}>{labels.phone.manageNumbers}</Link>
                    </Button>
                  </div>
                ) : (
                  phoneNumbers.map((number) => (
                    <div
                      key={number.id}
                      className="grid gap-4 rounded-md border p-4 md:grid-cols-[1fr_240px]"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="font-medium">{number.phone_number}</div>
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant={
                              number.provisioning_status === "active" ? "default" : "destructive"
                            }
                          >
                            {number.provisioning_status === "active"
                              ? labels.phone.active
                              : labels.phone.vapiError}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Label>{labels.phone.assignedTo}</Label>
                        <Select
                          value={number.agent_id ?? "unassigned"}
                          onValueChange={(value) => void assignNumber(number.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">{labels.phone.unassigned}</SelectItem>
                            {agents.map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : null}

          {step === 4 ? (
            <Card>
              <CardHeader>
                <CardTitle>{labels.integrations.title}</CardTitle>
                <CardDescription>{labels.integrations.description}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-3 rounded-md border p-4">
                  <div className="flex items-center gap-2 font-medium">
                    <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                    {labels.integrations.calcom}
                  </div>
                  <Badge className="w-fit" variant={settings.bookingEnabled ? "default" : "outline"}>
                    {settings.bookingEnabled ? labels.integrations.enabled : labels.integrations.disabled}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {settings.calcomApiKey && settings.calcomEventTypeId
                      ? labels.integrations.settingsReady
                      : labels.integrations.settingsMissing}
                  </p>
                </div>
                <div className="flex flex-col gap-3 rounded-md border p-4">
                  <div className="flex items-center gap-2 font-medium">
                    <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                    {labels.integrations.sms}
                  </div>
                  <Badge className="w-fit" variant={settings.smsEnabled ? "default" : "outline"}>
                    {settings.smsEnabled ? labels.integrations.enabled : labels.integrations.disabled}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {settings.smsSenderNumber
                      ? labels.integrations.settingsReady
                      : labels.integrations.settingsMissing}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Button asChild variant="outline">
                    <Link href={`/${locale}/settings`}>{labels.integrations.openSettings}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 5 ? (
            <Card>
              <CardHeader>
                <CardTitle>{labels.test.title}</CardTitle>
                <CardDescription>{labels.test.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {[
                  [labels.test.profile, completion.profile],
                  [labels.test.hours, completion.hours],
                  [labels.test.agent, completion.agent],
                  [labels.test.phone, completion.phone],
                  [labels.test.integrations, completion.integrations],
                ].map(([label, done]) => (
                  <div key={String(label)} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`flex size-7 items-center justify-center rounded-full ${completionClass(Boolean(done))}`}>
                        <Check className="h-4 w-4" />
                      </span>
                      <span className="font-medium">{label}</span>
                    </div>
                    <Badge variant={done ? "default" : "outline"}>
                      {done ? labels.completed : labels.incomplete}
                    </Badge>
                  </div>
                ))}
                <Separator />
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild disabled={!firstAgent}>
                    <Link href={firstAgent ? `/${locale}/agents/${firstAgent.id}` : `/${locale}/agents`}>
                      <Bot className="mr-2 h-4 w-4" />
                      {labels.test.testAgent}
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/${locale}/dashboard`}>
                      <PhoneCall className="mr-2 h-4 w-4" />
                      {labels.test.openDashboard}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              disabled={step === 0}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              {labels.back}
            </Button>
            <div className="flex flex-col gap-3 sm:flex-row">
              {(step === 0 || step === 1 || step === 4) && (
                <Button type="button" variant="outline" disabled={isPending} onClick={() => saveCurrentSettings()}>
                  <Save className="mr-2 h-4 w-4" />
                  {isPending ? labels.saving : labels.saveStep}
                </Button>
              )}
              <Button
                type="button"
                onClick={() => {
                  if (step === 0 || step === 1 || step === 4) {
                    saveCurrentSettings(() => setStep((current) => Math.min(5, current + 1)));
                    return;
                  }
                  setStep((current) => Math.min(5, current + 1));
                }}
              >
                {step === 5 ? labels.complete : labels.next}
                {step === 5 ? null : <ChevronRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
