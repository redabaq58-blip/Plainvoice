"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
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
  buildAgentSystemPrompt,
  defaultKnowledgeBase,
  toApiPayload,
  VERTICALS,
  LANGUAGES,
  VOICE_PROVIDERS,
  STATUSES,
  MAX_DURATIONS,
  TONES,
  type VoiceAgentCreateInput,
} from "@/lib/schemas/voice-agent";
import {
  getTemplate,
  getTemplateFirstMessage,
  getTemplatePrompt,
} from "@/lib/agent-templates";
import {
  DEMO_PACKS,
  applyDemoPack,
  getDemoPack,
  summarizeDemoPack,
  type DemoPackId,
} from "@/lib/demo-packs";

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
  vapiWarning: string;
  knowledge: {
    title: string;
    businessDescription: string;
    businessDescriptionPlaceholder: string;
    servicesOffered: string;
    servicesOfferedPlaceholder: string;
    pricingNotes: string;
    pricingNotesPlaceholder: string;
    faqs: string;
    question: string;
    questionPlaceholder: string;
    answer: string;
    answerPlaceholder: string;
    addFaq: string;
    removeFaq: string;
    policies: string;
    policiesPlaceholder: string;
    emergencyInstructions: string;
    emergencyInstructionsPlaceholder: string;
    serviceArea: string;
    serviceAreaPlaceholder: string;
    tone: string;
    toneLabels: Record<string, string>;
    promptPreview: string;
  };
  verticalLabels: Record<string, string>;
  languageLabels: Record<string, string>;
  voiceProviderLabels: Record<string, string>;
  statusLabels: Record<string, string>;
  demoPack?: {
    title: string;
    description: string;
    placeholder: string;
    apply: string;
    clear: string;
    packs: Record<string, string>;
    preview: {
      services: string;
      faqs: string;
      businessHours: string;
      emergency: string;
      pricing: string;
      qaScenarios: string;
      smsTemplates: string;
      included: string;
    };
  };
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
  const defaultTemplate = getTemplate(defaultValues?.vertical ?? "general");
  const defaultLanguage = defaultValues?.language ?? "fr";
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
      firstMessage: defaultTemplate
        ? getTemplateFirstMessage(defaultTemplate, defaultLanguage)
        : "",
      systemPrompt: defaultTemplate
        ? getTemplatePrompt(defaultTemplate, defaultLanguage)
        : "",
      transferPhoneNumber: "",
      maxCallDurationMinutes: 10,
      status: "draft",
      knowledgeBase: defaultKnowledgeBase,
    },
  });

  const currentLanguage = watch("language");
  const currentValues = watch();
  const promptPreview = buildAgentSystemPrompt(currentValues);
  const faqs = currentValues.knowledgeBase.faqs;
  const [vapiWarning, setVapiWarning] = useState<string | null>(null);
  const [selectedPackId, setSelectedPackId] = useState<DemoPackId | "">("");
  const selectedPack = selectedPackId ? getDemoPack(selectedPackId) : undefined;
  const packSummary = selectedPack ? summarizeDemoPack(selectedPack) : undefined;

  function handleApplyDemoPack() {
    if (!selectedPack) return;
    const overrides = applyDemoPack(selectedPack, currentLanguage);
    if (overrides.name !== undefined) setValue("name", overrides.name);
    if (overrides.vertical !== undefined) setValue("vertical", overrides.vertical);
    if (overrides.firstMessage !== undefined) setValue("firstMessage", overrides.firstMessage);
    if (overrides.systemPrompt !== undefined) setValue("systemPrompt", overrides.systemPrompt);
    if (overrides.knowledgeBase !== undefined) setValue("knowledgeBase", overrides.knowledgeBase);
  }

  function handleVerticalChange(vertical: string) {
    setValue("vertical", vertical as VoiceAgentCreateInput["vertical"]);
    const template = getTemplate(vertical);
    if (template) {
      setValue("systemPrompt", getTemplatePrompt(template, currentLanguage));
      setValue("firstMessage", getTemplateFirstMessage(template, currentLanguage));
    }
  }

  function handleLanguageChange(language: string) {
    const nextLanguage = language as VoiceAgentCreateInput["language"];
    setValue("language", nextLanguage);
    const template = getTemplate(watch("vertical"));
    if (template) {
      setValue("systemPrompt", getTemplatePrompt(template, nextLanguage));
      setValue("firstMessage", getTemplateFirstMessage(template, nextLanguage));
    }
  }

  async function onSubmit(data: VoiceAgentCreateInput) {
    setVapiWarning(null);
    const payload = toApiPayload(data);

    if (mode === "create") {
      const result = await apiFetch<{ id: string; vapi_sync_warning?: string | null }>("/api/voice-agents", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (result.vapi_sync_warning) {
        router.push(`/${locale}/agents/${result.id}?vapiSync=skipped`);
        return;
      }
      router.push(`/${locale}/agents/${result.id}`);
    } else {
      const result = await apiFetch<{ vapi_sync_warning?: string | null }>(`/api/voice-agents/${agentId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (result.vapi_sync_warning) {
        setVapiWarning(labels.vapiWarning);
      }
      onSaved?.();
      router.refresh();
    }
  }

  function addFaq() {
    setValue("knowledgeBase.faqs", [...faqs, { question: "", answer: "" }]);
  }

  function removeFaq(index: number) {
    const nextFaqs = faqs.filter((_, faqIndex) => faqIndex !== index);
    setValue("knowledgeBase.faqs", nextFaqs.length > 0 ? nextFaqs : [{ question: "", answer: "" }]);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {vapiWarning && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {vapiWarning}
        </div>
      )}

      {/* Demo Pack — create mode only */}
      {mode === "create" && labels.demoPack && (
        <section className="space-y-3 rounded-md border border-dashed bg-muted/30 p-4">
          <div>
            <Label className="text-base">{labels.demoPack.title}</Label>
            <p className="text-sm text-muted-foreground">
              {labels.demoPack.description}
            </p>
          </div>
          <div className="flex gap-2">
            <Select
              value={selectedPackId}
              onValueChange={(v) => setSelectedPackId(v as DemoPackId)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={labels.demoPack.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {DEMO_PACKS.map((pack) => (
                  <SelectItem key={pack.id} value={pack.id}>
                    {labels.demoPack!.packs[pack.id] ?? pack.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={handleApplyDemoPack}
              disabled={!selectedPack}
            >
              {labels.demoPack.apply}
            </Button>
          </div>
          {selectedPack && packSummary && (
            <div className="space-y-1 text-sm">
              <div className="font-medium">{labels.demoPack.preview.included}</div>
              <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                <li>
                  {packSummary.services} {labels.demoPack.preview.services}
                </li>
                <li>
                  {packSummary.faqs} {labels.demoPack.preview.faqs}
                </li>
                <li>
                  {packSummary.businessHoursDays} {labels.demoPack.preview.businessHours}
                </li>
                {packSummary.hasEmergency && (
                  <li>{labels.demoPack.preview.emergency}</li>
                )}
                {packSummary.hasPricing && <li>{labels.demoPack.preview.pricing}</li>}
                <li>
                  {packSummary.qaScenarios} {labels.demoPack.preview.qaScenarios}
                </li>
                <li>
                  {packSummary.smsTemplates} {labels.demoPack.preview.smsTemplates}
                </li>
              </ul>
            </div>
          )}
        </section>
      )}

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

      <section className="space-y-4 rounded-md border p-4">
        <div>
          <h2 className="text-lg font-semibold">{labels.knowledge.title}</h2>
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessDescription">
            {labels.knowledge.businessDescription}
          </Label>
          <Textarea
            id="businessDescription"
            placeholder={labels.knowledge.businessDescriptionPlaceholder}
            rows={4}
            {...register("knowledgeBase.businessDescription")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="servicesOffered">{labels.knowledge.servicesOffered}</Label>
          <Textarea
            id="servicesOffered"
            placeholder={labels.knowledge.servicesOfferedPlaceholder}
            rows={4}
            {...register("knowledgeBase.servicesOffered")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pricingNotes">{labels.knowledge.pricingNotes}</Label>
          <Textarea
            id="pricingNotes"
            placeholder={labels.knowledge.pricingNotesPlaceholder}
            rows={3}
            {...register("knowledgeBase.pricingNotes")}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label>{labels.knowledge.faqs}</Label>
            <Button type="button" variant="outline" size="sm" onClick={addFaq}>
              <Plus className="mr-2 h-4 w-4" />
              {labels.knowledge.addFaq}
            </Button>
          </div>
          {faqs.map((_, index) => (
            <div key={index} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={`faq-question-${index}`}>
                  {labels.knowledge.question}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeFaq(index)}
                  aria-label={labels.knowledge.removeFaq}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Input
                id={`faq-question-${index}`}
                placeholder={labels.knowledge.questionPlaceholder}
                {...register(`knowledgeBase.faqs.${index}.question`)}
              />
              <Label htmlFor={`faq-answer-${index}`}>
                {labels.knowledge.answer}
              </Label>
              <Textarea
                id={`faq-answer-${index}`}
                placeholder={labels.knowledge.answerPlaceholder}
                rows={3}
                {...register(`knowledgeBase.faqs.${index}.answer`)}
              />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label htmlFor="policies">{labels.knowledge.policies}</Label>
          <Textarea
            id="policies"
            placeholder={labels.knowledge.policiesPlaceholder}
            rows={3}
            {...register("knowledgeBase.policies")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="emergencyInstructions">
            {labels.knowledge.emergencyInstructions}
          </Label>
          <Textarea
            id="emergencyInstructions"
            placeholder={labels.knowledge.emergencyInstructionsPlaceholder}
            rows={3}
            {...register("knowledgeBase.emergencyInstructions")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="serviceArea">{labels.knowledge.serviceArea}</Label>
          <Textarea
            id="serviceArea"
            placeholder={labels.knowledge.serviceAreaPlaceholder}
            rows={3}
            {...register("knowledgeBase.serviceArea")}
          />
        </div>

        <div className="space-y-2">
          <Label>{labels.knowledge.tone}</Label>
          <Select
            value={watch("knowledgeBase.tone")}
            onValueChange={(v) =>
              setValue("knowledgeBase.tone", v as VoiceAgentCreateInput["knowledgeBase"]["tone"])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((tone) => (
                <SelectItem key={tone} value={tone}>
                  {labels.knowledge.toneLabels[tone] ?? tone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="space-y-2">
        <Label htmlFor="promptPreview">{labels.knowledge.promptPreview}</Label>
        <Textarea
          id="promptPreview"
          value={promptPreview}
          readOnly
          rows={12}
          className="font-mono text-xs"
        />
      </section>

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
