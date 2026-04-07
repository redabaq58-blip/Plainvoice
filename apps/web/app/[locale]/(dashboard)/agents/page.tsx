"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Pencil, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteAgentButton } from "@/components/agents/agent-actions";
import { apiFetch } from "@/lib/api";

type Agent = {
  id: string;
  name: string;
  status: string;
  language: string;
  vertical: string;
  phone_number: string | null;
  total_calls: number;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  paused: "secondary",
  draft: "outline",
};

export default function AgentsPage() {
  const t = useTranslations("agents");
  const { locale } = useParams<{ locale: string }>();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    apiFetch<Agent[]>("/api/voice-agents")
      .then(setAgents)
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return <div className="p-6 text-muted-foreground">{t("empty.title")}...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <Button asChild>
          <Link href={`/${locale}/agents/new`}>
            <Plus className="mr-2 h-4 w-4" />
            {t("createAgent")}
          </Link>
        </Button>
      </div>

      {agents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Bot className="mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="text-lg font-semibold">{t("empty.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("empty.description")}
            </p>
            <Button className="mt-4" asChild>
              <Link href={`/${locale}/agents/new`}>
                <Plus className="mr-2 h-4 w-4" />
                {t("createAgent")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.name")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead>{t("table.language")}</TableHead>
                <TableHead>{t("table.vertical")}</TableHead>
                <TableHead>{t("table.phoneNumber")}</TableHead>
                <TableHead className="text-right">
                  {t("table.totalCalls")}
                </TableHead>
                <TableHead className="text-right">
                  {t("table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/${locale}/agents/${agent.id}`}
                      className="hover:underline"
                    >
                      {agent.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[agent.status] ?? "outline"}>
                      {t(`status.${agent.status}` as Parameters<typeof t>[0])}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {t(`language.${agent.language}` as Parameters<typeof t>[0])}
                  </TableCell>
                  <TableCell>
                    {t(`vertical.${agent.vertical}` as Parameters<typeof t>[0])}
                  </TableCell>
                  <TableCell>{agent.phone_number ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {agent.total_calls}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link href={`/${locale}/agents/${agent.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <DeleteAgentButton
                        agentId={agent.id}
                        onDeleted={() => setRefreshKey((k) => k + 1)}
                        labels={{
                          deleteAction: t("deleteAction"),
                          title: t("delete.title"),
                          message: t("delete.message"),
                          confirm: t("delete.confirm"),
                          cancel: t("delete.cancel"),
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
