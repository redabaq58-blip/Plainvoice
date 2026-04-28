"use client";

import { FormEvent, useState, useTransition } from "react";
import { Clock, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DAYS,
  LANGUAGES,
  MAX_CALL_DURATIONS,
  VOICE_PROVIDERS,
  organizationSettingsSchema,
  type BusinessHours,
  type OrganizationSettingsInput,
} from "@/lib/schemas/organization-settings";

export type SettingsLabels = {
  title: string;
  subtitle: string;
  profileTitle: string;
  organizationName: string;
  businessEmail: string;
  businessPhone: string;
  websiteUrl: string;
  timezone: string;
  businessHoursTitle: string;
  open: string;
  closed: string;
  openTime: string;
  closeTime: string;
  voiceTitle: string;
  defaultLanguage: string;
  defaultVoiceProvider: string;
  defaultVoiceId: string;
  defaultVoiceIdPlaceholder: string;
  defaultMaxCallDuration: string;
  save: string;
  saving: string;
  saved: string;
  error: string;
  days: Record<(typeof DAYS)[number], string>;
  languages: Record<(typeof LANGUAGES)[number], string>;
  voiceProviders: Record<(typeof VOICE_PROVIDERS)[number], string>;
  durations: Record<string, string>;
};

type SaveResult = {
  ok: boolean;
  message: string | null;
};

type Props = {
  initialValues: OrganizationSettingsInput;
  labels: SettingsLabels;
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

export function SettingsClient({ initialValues, labels, saveSettings }: Props) {
  const [values, setValues] = useState<OrganizationSettingsInput>(initialValues);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsError(false);

    const parsed = organizationSettingsSchema.safeParse(values);
    if (!parsed.success) {
      setIsError(true);
      setMessage(labels.error);
      return;
    }

    startTransition(async () => {
      const result = await saveSettings(parsed.data);
      setIsError(!result.ok);
      setMessage(result.ok ? labels.saved : result.message ?? labels.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{labels.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{labels.subtitle}</p>
        </div>
        <Button type="submit" disabled={isPending} className="gap-2 sm:w-auto">
          <Save className="h-4 w-4" />
          {isPending ? labels.saving : labels.save}
        </Button>
      </div>

      {message && (
        <Alert variant={isError ? "destructive" : "default"}>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{labels.profileTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="organization-name">{labels.organizationName}</Label>
            <Input
              id="organization-name"
              value={values.name}
              onChange={(event) =>
                setValues((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="business-email">{labels.businessEmail}</Label>
            <Input
              id="business-email"
              type="email"
              value={values.businessEmail}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  businessEmail: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="business-phone">{labels.businessPhone}</Label>
            <Input
              id="business-phone"
              type="tel"
              value={values.businessPhone}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  businessPhone: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website-url">{labels.websiteUrl}</Label>
            <Input
              id="website-url"
              type="url"
              value={values.websiteUrl}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  websiteUrl: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="timezone">{labels.timezone}</Label>
            <Input
              id="timezone"
              value={values.timezone}
              onChange={(event) =>
                setValues((current) => ({ ...current, timezone: event.target.value }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{labels.businessHoursTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {DAYS.map((day) => {
            const dayValues = values.businessHours[day];
            return (
              <div
                key={day}
                className="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(120px,1fr)_120px_1fr_1fr]"
              >
                <div className="flex items-center gap-2 font-medium">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {labels.days[day]}
                </div>

                <Select
                  value={dayValues.isOpen ? "open" : "closed"}
                  onValueChange={(value) =>
                    setValues((current) => ({
                      ...current,
                      businessHours: updateBusinessDay(current.businessHours, day, {
                        isOpen: value === "open",
                      }),
                    }))
                  }
                >
                  <SelectTrigger aria-label={labels.days[day]}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{labels.open}</SelectItem>
                    <SelectItem value="closed">{labels.closed}</SelectItem>
                  </SelectContent>
                </Select>

                <div className="space-y-1">
                  <Label htmlFor={`${day}-open`} className="text-xs">
                    {labels.openTime}
                  </Label>
                  <Input
                    id={`${day}-open`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-2][0-9]:[0-5][0-9]"
                    value={dayValues.openTime}
                    disabled={!dayValues.isOpen}
                    onInput={(event) => {
                      const openTime = event.currentTarget.value;
                      setValues((current) => ({
                        ...current,
                        businessHours: updateBusinessDay(current.businessHours, day, {
                          openTime,
                        }),
                      }));
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor={`${day}-close`} className="text-xs">
                    {labels.closeTime}
                  </Label>
                  <Input
                    id={`${day}-close`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-2][0-9]:[0-5][0-9]"
                    value={dayValues.closeTime}
                    disabled={!dayValues.isOpen}
                    onInput={(event) => {
                      const closeTime = event.currentTarget.value;
                      setValues((current) => ({
                        ...current,
                        businessHours: updateBusinessDay(current.businessHours, day, {
                          closeTime,
                        }),
                      }));
                    }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{labels.voiceTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{labels.defaultLanguage}</Label>
            <Select
              value={values.defaultLanguage}
              onValueChange={(value) =>
                setValues((current) => ({
                  ...current,
                  defaultLanguage: value as OrganizationSettingsInput["defaultLanguage"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((language) => (
                  <SelectItem key={language} value={language}>
                    {labels.languages[language]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{labels.defaultVoiceProvider}</Label>
            <Select
              value={values.defaultVoiceProvider}
              onValueChange={(value) =>
                setValues((current) => ({
                  ...current,
                  defaultVoiceProvider:
                    value as OrganizationSettingsInput["defaultVoiceProvider"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOICE_PROVIDERS.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {labels.voiceProviders[provider]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-voice-id">{labels.defaultVoiceId}</Label>
            <Input
              id="default-voice-id"
              value={values.defaultVoiceId}
              placeholder={labels.defaultVoiceIdPlaceholder}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  defaultVoiceId: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>{labels.defaultMaxCallDuration}</Label>
            <Select
              value={String(values.defaultMaxCallDurationMinutes)}
              onValueChange={(value) =>
                setValues((current) => ({
                  ...current,
                  defaultMaxCallDurationMinutes: Number(value),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MAX_CALL_DURATIONS.map((duration) => (
                  <SelectItem key={duration} value={String(duration)}>
                    {labels.durations[String(duration)]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
