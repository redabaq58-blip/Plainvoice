"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import {
  voiceAgentCreateSchema,
  toApiPayload,
  VERTICALS,
  LANGUAGES,
  VOICE_PROVIDERS,
  STATUSES,
  MAX_DURATIONS,
  type VoiceAgentCreateInput,
} from "@/lib/schemas/voice-agent";
import { getTemplate } from "@/lib/agent-templates";

type Labels = {
  name: string;
  namePlaceholder: string;
  vertical: string;
  language: string;
  voiceProvider: string;
  voiceId: string;
  voiceIdPlaceholder: string;
  firstMessage: string;
  firstMessagePlaceholder: string;
  systemPrompt: string;
  systemPromptPlaceholder: string;
  transferPhoneNumber: string;
  transferPhoneNumberPlaceholder: string;
  maxCallDuration: string;
  maxCallDurationMinutes: Record<string, string>;
  status: string;
  submit: string;
  save: string;
  verticalLabels: Record<string, string>;
  languageLabels: Record<string, string>;
  voiceProviderLabels: Record<string, string>;
  statusLabels: Record<string, string>;
};

type AgentFormProps = {
  locale: string;
  labels: Labels;
  mode: "create" | "edit";
  agentId?: string;
  defaultValues?: VoiceAgentCreateInput;
  onSaved?: () => void;
};

export function AgentForm({
  locale,
  labels,
  mode,
  agentId,
  defaultValues,
  onSaved,
}: AgentFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VoiceAgentCreateInput>({
    resolver: zodResolver(voiceAgentCreateSchema),
    defaultValues: defaultValues ?? {
      name: "",
      vertical: "general",
      language: "fr",
      voiceProvider: "elevenlabs",
      voiceId: "",
      firstMessage: "",
      systemPrompt: "",
      transferPhoneNumber: "",
      maxCallDurationMinutes: 10,
      status: "draft",
    },
  });

  const currentLanguage = watch("language");
  const currentVertical = watch("vertical");

  function handleVerticalChange(vertical: string) {
    setValue("vertical", vertical as VoiceAgentCreateInput["vertical"]);
    const template = getTemplate(vertical);
    if (template) {
      const isFr = currentLanguage === "fr" || currentLanguage === "bilingual";
      setValue("systemPrompt", isFr ? template.systemPromptFr : template.systemPromptEn);
      setValue("firstMessage", isFr ? template.firstMessageFr : template.firstMessageEn);
    }
  }

  function handleLanguageChange(language: string) {
    setValue("language", language as VoiceAgentCreateInput["language"]);
    const template = getTemplate(currentVertical);
    if (template) {
      const isFr = language === "fr" || language === "bilingual";
      setValue("systemPrompt", isFr ? template.systemPromptFr : template.systemPromptEn);
      setValue("firstMessage", isFr ? template.firstMessageFr : template.firstMessageEn);
    }
  }

  async function onSubmit(data: VoiceAgentCreateInput) {
    const payload = toApiPayload(data);

    if (mode === "create") {
      const result = await apiFetch<{ id: string }>("/api/voice-agents", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.push(`/${locale}/agents/${result.id}`);
    } else {
      await apiFetch(`/api/voice-agents/${agentId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      onSaved?.();
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">{labels.name}</Label>
        <Input
          id="name"
          placeholder={labels.namePlaceholder}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Vertical */}
      <div className="space-y-2">
        <Label>{labels.vertical}</Label>
        <Select
          value={watch("vertical")}
          onValueChange={handleVerticalChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VERTICALS.map((v) => (
              <SelectItem key={v} value={v}>
                {labels.verticalLabels[v] ?? v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Language */}
      <div className="space-y-2">
        <Label>{labels.language}</Label>
        <Select
          value={watch("language")}
          onValueChange={handleLanguageChange}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => (
              <SelectItem key={l} value={l}>
                {labels.languageLabels[l] ?? l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Voice Provider */}
      <div className="space-y-2">
        <Label>{labels.voiceProvider}</Label>
        <Select
          value={watch("voiceProvider")}
          onValueChange={(v) =>
            setValue("voiceProvider", v as VoiceAgentCreateInput["voiceProvider"])
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VOICE_PROVIDERS.map((vp) => (
              <SelectItem key={vp} value={vp}>
                {labels.voiceProviderLabels[vp] ?? vp}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Voice ID */}
      <div className="space-y-2">
        <Label htmlFor="voiceId">{labels.voiceId}</Label>
        <Input
          id="voiceId"
          placeholder={labels.voiceIdPlaceholder}
          {...register("voiceId")}
        />
      </div>

      {/* First Message */}
      <div className="space-y-2">
        <Label htmlFor="firstMessage">{labels.firstMessage}</Label>
        <Textarea
          id="firstMessage"
          placeholder={labels.firstMessagePlaceholder}
          rows={3}
          {...register("firstMessage")}
        />
      </div>

      {/* System Prompt */}
      <div className="space-y-2">
        <Label htmlFor="systemPrompt">{labels.systemPrompt}</Label>
        <Textarea
          id="systemPrompt"
          placeholder={labels.systemPromptPlaceholder}
          rows={6}
          {...register("systemPrompt")}
        />
      </div>

      {/* Transfer Phone Number */}
      <div className="space-y-2">
        <Label htmlFor="transferPhoneNumber">{labels.transferPhoneNumber}</Label>
        <Input
          id="transferPhoneNumber"
          placeholder={labels.transferPhoneNumberPlaceholder}
          {...register("transferPhoneNumber")}
        />
      </div>

      {/* Max Call Duration */}
      <div className="space-y-2">
        <Label>{labels.maxCallDuration}</Label>
        <Select
          value={String(watch("maxCallDurationMinutes"))}
          onValueChange={(v) => setValue("maxCallDurationMinutes", Number(v))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MAX_DURATIONS.map((d) => (
              <SelectItem key={d} value={String(d)}>
                {labels.maxCallDurationMinutes[String(d)] ?? `${d} min`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label>{labels.status}</Label>
        <Select
          value={watch("status")}
          onValueChange={(v) =>
            setValue("status", v as VoiceAgentCreateInput["status"])
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {labels.statusLabels[s] ?? s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? "..."
          : mode === "create"
            ? labels.submit
            : labels.save}
      </Button>
    </form>
  );
}
