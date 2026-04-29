import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { Check, Pencil, RotateCcw, Search, Trash2 } from "lucide-react";
import type { Database } from "@repo/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createContactsSupabaseClient, getCurrentOrgId } from "@/lib/contacts-server";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    status?: TaskStatusFilter;
    priority?: string;
    q?: string;
  }>;
};

type TaskStatus = "open" | "done";
type TaskStatusFilter = TaskStatus | "all";
type TaskPriority = "low" | "normal" | "high" | "urgent";
type TaskRow = Database["public"]["Tables"]["follow_up_tasks"]["Row"];

type ContactRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company: string | null;
};

type CallRow = {
  id: string;
  from_number: string | null;
  started_at: string | null;
  summary: string | null;
};

const STATUS_FILTERS: TaskStatusFilter[] = ["open", "done", "all"];
const PRIORITIES: TaskPriority[] = ["low", "normal", "high", "urgent"];
const PRIORITY_VARIANT: Record<TaskPriority, "default" | "secondary" | "destructive" | "outline"> = {
  low: "outline",
  normal: "secondary",
  high: "default",
  urgent: "destructive",
};

function cleanSearch(value: string) {
  return value.trim().toLowerCase();
}

function nullableFormValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function dueAtFromForm(formData: FormData) {
  const value = nullableFormValue(formData, "dueAt");
  return value ? new Date(value).toISOString() : null;
}

function contactName(contact: ContactRow | undefined, fallback: string) {
  if (!contact) return null;
  return [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.company || fallback;
}

function formatDateTime(value: string | null, locale: string, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function taskMatchesSearch(
  task: TaskRow,
  contact: ContactRow | undefined,
  call: CallRow | undefined,
  search: string,
) {
  if (!search) return true;
  const haystack = [
    task.title,
    task.description,
    contact?.first_name,
    contact?.last_name,
    contact?.company,
    contact?.phone,
    call?.from_number,
    call?.summary,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(search);
}

export default async function TasksPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations("tasks");
  const orgId = await getCurrentOrgId();

  if (!orgId) {
    redirect(`/${locale}/dashboard`);
  }

  const activeStatus: TaskStatusFilter = STATUS_FILTERS.includes(sp.status ?? "open")
    ? sp.status ?? "open"
    : "open";
  const activePriority = PRIORITIES.includes(sp.priority as TaskPriority) ? sp.priority ?? "all" : "all";
  const search = cleanSearch(sp.q ?? "");

  async function createTask(formData: FormData) {
    "use server";

    const title = nullableFormValue(formData, "title");
    const currentOrgId = await getCurrentOrgId();

    if (!currentOrgId || !title) {
      return;
    }

    const priority = nullableFormValue(formData, "priority") ?? "normal";
    const source = nullableFormValue(formData, "source") ?? "manual";
    const sb = await createContactsSupabaseClient();

    await sb.from("follow_up_tasks").insert({
      org_id: currentOrgId,
      title,
      description: nullableFormValue(formData, "description"),
      priority,
      due_at: dueAtFromForm(formData),
      contact_id: nullableFormValue(formData, "contactId"),
      call_id: nullableFormValue(formData, "callId"),
      agent_id: nullableFormValue(formData, "agentId"),
      source,
      source_event_id: nullableFormValue(formData, "sourceEventId"),
    });

    revalidatePath(`/${locale}/tasks`);
    redirect(`/${locale}/tasks`);
  }

  async function updateTask(formData: FormData) {
    "use server";

    const taskId = nullableFormValue(formData, "taskId");
    const title = nullableFormValue(formData, "title");
    const currentOrgId = await getCurrentOrgId();

    if (!currentOrgId || !taskId || !title) {
      return;
    }

    const sb = await createContactsSupabaseClient();
    await sb
      .from("follow_up_tasks")
      .update({
        title,
        description: nullableFormValue(formData, "description"),
        priority: nullableFormValue(formData, "priority") ?? "normal",
        due_at: dueAtFromForm(formData),
      })
      .eq("org_id", currentOrgId)
      .eq("id", taskId);

    revalidatePath(`/${locale}/tasks`);
  }

  async function setTaskStatus(formData: FormData) {
    "use server";

    const taskId = nullableFormValue(formData, "taskId");
    const status = nullableFormValue(formData, "status") as TaskStatus | null;
    const currentOrgId = await getCurrentOrgId();

    if (!currentOrgId || !taskId || !status || !["open", "done"].includes(status)) {
      return;
    }

    const sb = await createContactsSupabaseClient();
    await sb
      .from("follow_up_tasks")
      .update({
        status,
        completed_at: status === "done" ? new Date().toISOString() : null,
      })
      .eq("org_id", currentOrgId)
      .eq("id", taskId);

    revalidatePath(`/${locale}/tasks`);
  }

  async function deleteTask(formData: FormData) {
    "use server";

    const taskId = nullableFormValue(formData, "taskId");
    const currentOrgId = await getCurrentOrgId();

    if (!currentOrgId || !taskId) {
      return;
    }

    const sb = await createContactsSupabaseClient();
    await sb.from("follow_up_tasks").delete().eq("org_id", currentOrgId).eq("id", taskId);
    revalidatePath(`/${locale}/tasks`);
  }

  const supabase = await createContactsSupabaseClient();
  let query = supabase
    .from("follow_up_tasks")
    .select(
      "id, org_id, title, description, status, priority, due_at, contact_id, call_id, agent_id, source, source_event_id, created_by, completed_at, created_at, updated_at",
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (activeStatus !== "all") {
    query = query.eq("status", activeStatus);
  }

  if (activePriority !== "all") {
    query = query.eq("priority", activePriority);
  }

  const { data: taskRows } = await query;
  const tasks = (taskRows ?? []) as TaskRow[];
  const contactIds = [...new Set(tasks.map((task) => task.contact_id).filter(Boolean))] as string[];
  const callIds = [...new Set(tasks.map((task) => task.call_id).filter(Boolean))] as string[];

  const [contactsResult, callsResult, openCountResult] = await Promise.all([
    contactIds.length > 0
      ? supabase.from("contacts").select("id, first_name, last_name, phone, company").eq("org_id", orgId).in("id", contactIds)
      : Promise.resolve({ data: [] }),
    callIds.length > 0
      ? supabase.from("calls").select("id, from_number, started_at, summary").eq("org_id", orgId).in("id", callIds)
      : Promise.resolve({ data: [] }),
    supabase.from("follow_up_tasks").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "open"),
  ]);

  const contactsById = new Map(((contactsResult.data ?? []) as ContactRow[]).map((contact) => [contact.id, contact]));
  const callsById = new Map(((callsResult.data ?? []) as CallRow[]).map((call) => [call.id, call]));
  const visibleTasks = tasks.filter((task) =>
    taskMatchesSearch(task, contactsById.get(task.contact_id ?? ""), callsById.get(task.call_id ?? ""), search),
  );
  const openCount = openCountResult.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Card className="sm:min-w-44">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{openCount}</div>
            <p className="text-xs text-muted-foreground">{t("openCount")}</p>
          </CardContent>
        </Card>
      </div>

      <details className="group rounded-lg border">
        <summary
          role="button"
          className="inline-flex h-9 cursor-pointer list-none items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90"
        >
          {t("createButton")}
        </summary>
        <form action={createTask} className="grid gap-4 border-t p-4 md:grid-cols-2">
          <input type="hidden" name="source" value="manual" />
          <p className="text-sm text-muted-foreground md:col-span-2">{t("createDescription")}</p>
          <label className="space-y-2 text-sm font-medium">
            {t("fields.title")}
            <Input name="title" required />
          </label>
          <label className="space-y-2 text-sm font-medium">
            {t("fields.priority")}
            <select name="priority" defaultValue="normal" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {t(`priority.${priority}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium">
            {t("fields.dueAt")}
            <Input name="dueAt" type="datetime-local" />
          </label>
          <label className="space-y-2 text-sm font-medium md:col-span-2">
            {t("fields.description")}
            <Textarea name="description" rows={3} />
          </label>
          <div className="md:col-span-2">
            <Button type="submit">{t("actions.create")}</Button>
          </div>
        </form>
      </details>

      <Card>
        <CardContent className="pt-6">
          <form className="grid gap-3 md:grid-cols-[1fr_160px_160px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input name="q" defaultValue={sp.q ?? ""} placeholder={t("searchPlaceholder")} className="pl-9" />
            </div>
            <select name="status" defaultValue={activeStatus} className="h-9 rounded-md border bg-background px-3 text-sm">
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {t(`filters.${status}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
            <select name="priority" defaultValue={activePriority} className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="all">{t("filters.anyPriority")}</option>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {t(`priority.${priority}` as Parameters<typeof t>[0])}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              {t("filter")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {visibleTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="font-semibold">{t("empty.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("empty.description")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleTasks.map((task) => {
            const contact = contactsById.get(task.contact_id ?? "");
            const call = callsById.get(task.call_id ?? "");
            const priority = task.priority as TaskPriority;
            return (
              <Card key={task.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <CardTitle className="text-base">{task.title}</CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={task.status === "done" ? "secondary" : "default"}>
                        {t(`status.${task.status}` as Parameters<typeof t>[0])}
                      </Badge>
                      <Badge variant={PRIORITY_VARIANT[priority] ?? "secondary"}>
                        {t(`priority.${priority}` as Parameters<typeof t>[0])}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                  <dl className="grid gap-3 text-sm md:grid-cols-4">
                    <div>
                      <dt className="text-xs text-muted-foreground">{t("fields.dueAt")}</dt>
                      <dd>{formatDateTime(task.due_at, locale, t("fallback.noDueDate"))}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">{t("fields.contact")}</dt>
                      <dd>{contactName(contact, t("fallback.untitledContact")) ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">{t("fields.call")}</dt>
                      <dd>{call ? formatDateTime(call.started_at, locale, t("fallback.untitledCall")) : "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">{t("fields.source")}</dt>
                      <dd>{t(`source.${task.source}` as Parameters<typeof t>[0])}</dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap gap-2">
                    {task.contact_id && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/${locale}/contacts/${task.contact_id}`}>{t("actions.openContact")}</Link>
                      </Button>
                    )}
                    {task.call_id && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/${locale}/calls/${task.call_id}`}>{t("actions.openCall")}</Link>
                      </Button>
                    )}
                    <form action={setTaskStatus}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <input type="hidden" name="status" value={task.status === "done" ? "open" : "done"} />
                      <Button type="submit" size="sm" variant={task.status === "done" ? "outline" : "default"}>
                        {task.status === "done" ? <RotateCcw className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        {task.status === "done" ? t("actions.reopen") : t("actions.markDone")}
                      </Button>
                    </form>
                    <form action={deleteTask}>
                      <input type="hidden" name="taskId" value={task.id} />
                      <Button type="submit" size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4" />
                        {t("actions.delete")}
                      </Button>
                    </form>
                  </div>

                  <details className="rounded-md border">
                    <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium">
                      <Pencil className="h-4 w-4" />
                      {t("actions.edit")}
                    </summary>
                    <form action={updateTask} className="grid gap-4 border-t p-4 md:grid-cols-2">
                      <input type="hidden" name="taskId" value={task.id} />
                      <label className="space-y-2 text-sm font-medium">
                        {t("fields.title")}
                        <Input name="title" defaultValue={task.title} required />
                      </label>
                      <label className="space-y-2 text-sm font-medium">
                        {t("fields.priority")}
                        <select name="priority" defaultValue={task.priority} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                          {PRIORITIES.map((item) => (
                            <option key={item} value={item}>
                              {t(`priority.${item}` as Parameters<typeof t>[0])}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2 text-sm font-medium">
                        {t("fields.dueAt")}
                        <Input name="dueAt" type="datetime-local" defaultValue={toDateTimeLocal(task.due_at)} />
                      </label>
                      <label className="space-y-2 text-sm font-medium md:col-span-2">
                        {t("fields.description")}
                        <Textarea name="description" rows={3} defaultValue={task.description ?? ""} />
                      </label>
                      <div className="md:col-span-2">
                        <Button type="submit" size="sm">
                          {t("actions.save")}
                        </Button>
                      </div>
                    </form>
                  </details>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
