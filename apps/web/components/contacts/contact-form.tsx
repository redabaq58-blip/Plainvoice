import { CONTACT_LANGUAGES, type ContactInput } from "@/lib/schemas/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type ContactFormLabels = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  company: string;
  language: string;
  leadScore: string;
  tags: string;
  tagsPlaceholder: string;
  doNotCall: string;
  notes: string;
  save: string;
  create: string;
  languages: Record<(typeof CONTACT_LANGUAGES)[number], string>;
};

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  labels: ContactFormLabels;
  submitLabel: string;
  defaultValues?: Partial<ContactInput>;
};

export function ContactForm({ action, labels, submitLabel, defaultValues }: Props) {
  const language = defaultValues?.languagePreference ?? "fr";

  return (
    <form action={action} className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="firstName">{labels.firstName}</Label>
        <Input id="firstName" name="firstName" defaultValue={defaultValues?.firstName ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lastName">{labels.lastName}</Label>
        <Input id="lastName" name="lastName" defaultValue={defaultValues?.lastName ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">{labels.phone}</Label>
        <Input id="phone" name="phone" type="tel" defaultValue={defaultValues?.phone ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{labels.email}</Label>
        <Input id="email" name="email" type="email" defaultValue={defaultValues?.email ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="company">{labels.company}</Label>
        <Input id="company" name="company" defaultValue={defaultValues?.company ?? ""} />
      </div>

      <div className="space-y-2">
        <Label>{labels.language}</Label>
        <Select name="languagePreference" defaultValue={language}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTACT_LANGUAGES.map((item) => (
              <SelectItem key={item} value={item}>
                {labels.languages[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="leadScore">{labels.leadScore}</Label>
        <Input
          id="leadScore"
          name="leadScore"
          type="number"
          min={0}
          max={100}
          defaultValue={defaultValues?.leadScore ?? 0}
        />
      </div>

      <div className="flex items-center gap-2 pt-7">
        <input
          id="doNotCall"
          name="doNotCall"
          type="checkbox"
          defaultChecked={defaultValues?.doNotCall ?? false}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="doNotCall">{labels.doNotCall}</Label>
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="tags">{labels.tags}</Label>
        <Input
          id="tags"
          name="tags"
          placeholder={labels.tagsPlaceholder}
          defaultValue={defaultValues?.tags ?? ""}
        />
      </div>

      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="notes">{labels.notes}</Label>
        <Textarea id="notes" name="notes" rows={5} defaultValue={defaultValues?.notes ?? ""} />
      </div>

      <div className="md:col-span-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
