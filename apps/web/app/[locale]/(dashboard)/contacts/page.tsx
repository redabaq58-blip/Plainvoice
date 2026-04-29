import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { ContactForm } from "@/components/contacts/contact-form";
import {
  contactFromFormData,
  parseTags,
  toContactPayload,
  type ContactInput,
} from "@/lib/schemas/contact";
import { createContactsSupabaseClient, getCurrentOrgId } from "@/lib/contacts-server";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    doNotCall?: string;
  }>;
};

type ContactRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  language_preference: string;
  lead_score: number;
  tags: string[];
  do_not_call: boolean;
  total_calls: number;
  last_call_at: string | null;
};

function cleanSearch(value: string) {
  return value.trim().replace(/[(),]/g, " ");
}

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString();
}

function fullName(contact: ContactRow) {
  return [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "-";
}

function buildFormLabels(t: Awaited<ReturnType<typeof getTranslations>>) {
  return {
    firstName: t("form.firstName"),
    lastName: t("form.lastName"),
    phone: t("form.phone"),
    email: t("form.email"),
    company: t("form.company"),
    language: t("form.language"),
    leadScore: t("form.leadScore"),
    tags: t("form.tags"),
    tagsPlaceholder: t("form.tagsPlaceholder"),
    doNotCall: t("form.doNotCall"),
    notes: t("form.notes"),
    save: t("form.save"),
    create: t("form.create"),
    createButton: t("createButton"),
    createTitle: t("createTitle"),
    createDescription: t("createDescription"),
    languages: {
      fr: t("languages.fr"),
      en: t("languages.en"),
    },
  };
}

export default async function ContactsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations("contacts");
  const orgId = await getCurrentOrgId();

  if (!orgId) {
    redirect(`/${locale}/dashboard`);
  }

  const supabase = await createContactsSupabaseClient();
  const search = cleanSearch(sp.q ?? "");
  const doNotCall = sp.doNotCall ?? "all";

  let query = supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, phone, email, company, language_preference, lead_score, tags, do_not_call, total_calls, last_call_at",
    )
    .eq("org_id", orgId)
    .order("updated_at", { ascending: false });

  if (search) {
    const pattern = `%${search}%`;
    query = query.or(
      [
        `first_name.ilike.${pattern}`,
        `last_name.ilike.${pattern}`,
        `phone.ilike.${pattern}`,
        `email.ilike.${pattern}`,
        `company.ilike.${pattern}`,
      ].join(","),
    );
  }

  if (doNotCall === "true" || doNotCall === "false") {
    query = query.eq("do_not_call", doNotCall === "true");
  }

  const { data } = await query;
  const contacts = (data ?? []) as ContactRow[];

  async function createContact(formData: FormData) {
    "use server";

    const parsed = contactFromFormData(formData);
    if (!parsed.success) {
      return;
    }

    const currentOrgId = await getCurrentOrgId();
    if (!currentOrgId) {
      return;
    }

    const sb = await createContactsSupabaseClient();
    const payload = toContactPayload(parsed.data as ContactInput);
    const { data: created } = await sb
      .from("contacts")
      .insert({
        org_id: currentOrgId,
        ...payload,
      })
      .select("id")
      .single();

    if (created?.id) {
      await sb.from("automation_events").insert({
        org_id: currentOrgId,
        event_type: "contact_created",
        status: "success",
        source: "system",
        contact_id: created.id,
        phone_number: payload.phone,
        message: `Contact created${payload.phone ? ` for ${payload.phone}` : ""}.`,
        metadata: { source_page: "contacts" },
      });
      redirect(`/${locale}/contacts/${created.id}`);
    }

    redirect(`/${locale}/contacts`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <details className="group rounded-lg border sm:min-w-48">
          <summary
            role="button"
            className="inline-flex h-9 cursor-pointer list-none items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90"
          >
            {t("createButton")}
          </summary>
          <div className="mt-3 border-t p-6 sm:absolute sm:right-6 sm:z-20 sm:w-[min(720px,calc(100vw-3rem))] sm:rounded-lg sm:border sm:bg-background sm:shadow-lg">
            <p className="mb-4 text-sm text-muted-foreground">{t("createDescription")}</p>
            <ContactForm
              action={createContact}
              labels={buildFormLabels(t)}
              submitLabel={t("form.create")}
            />
          </div>
        </details>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder={t("searchPlaceholder")}
                className="pl-9"
              />
            </div>
            <Select name="doNotCall" defaultValue={doNotCall}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("filters.all")}</SelectItem>
                <SelectItem value="true">{t("filters.doNotCall")}</SelectItem>
                <SelectItem value="false">{t("filters.callable")}</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">
              {t("filter")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="font-semibold">{t("empty.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("empty.description")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.name")}</TableHead>
                  <TableHead>{t("table.phone")}</TableHead>
                  <TableHead>{t("table.email")}</TableHead>
                  <TableHead>{t("table.company")}</TableHead>
                  <TableHead>{t("table.language")}</TableHead>
                  <TableHead>{t("table.leadScore")}</TableHead>
                  <TableHead>{t("table.tags")}</TableHead>
                  <TableHead>{t("table.totalCalls")}</TableHead>
                  <TableHead>{t("table.lastCallAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <Link
                        href={`/${locale}/contacts/${contact.id}`}
                        className="font-medium hover:underline"
                      >
                        {fullName(contact)}
                      </Link>
                      {contact.do_not_call && (
                        <Badge variant="destructive" className="ml-2">
                          {t("doNotCall")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{contact.phone ?? "-"}</TableCell>
                    <TableCell>{contact.email ?? "-"}</TableCell>
                    <TableCell>{contact.company ?? "-"}</TableCell>
                    <TableCell>
                      {t(`languages.${contact.language_preference}` as Parameters<typeof t>[0])}
                    </TableCell>
                    <TableCell>{contact.lead_score}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {parseTags(contact.tags.join(",")).length > 0
                          ? contact.tags.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))
                          : "-"}
                      </div>
                    </TableCell>
                    <TableCell>{contact.total_calls}</TableCell>
                    <TableCell>{formatDate(contact.last_call_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
