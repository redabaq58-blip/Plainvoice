"use client";

import { Phone, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CallWidget } from "@/components/voice/call-widget";
import { AgentForm } from "@/components/agents/agent-form";
import type { VoiceAgentCreateInput } from "@/lib/schemas/voice-agent";

type Call = {
  id: string;
  caller_number: string | null;
  duration_seconds: number | null;
  status: string;
  created_at: string;
};

type TabLabels = {
  overview: string;
  test: string;
  settings: string;
  callHistory: string;
  totalCalls: string;
  avgDuration: string;
  noCallsYet: string;
};

type TestLabels = {
  start: string;
  end: string;
  connecting: string;
  active: string;
  idle: string;
  ended: string;
};

type FormLabels = Parameters<typeof AgentForm>[0]["labels"];

type AgentDetailTabsProps = {
  locale: string;
  vapiAssistantId: string | null;
  agentId: string;
  agentDefaults: VoiceAgentCreateInput;
  totalCalls: number;
  avgDuration: number;
  recentCalls: Call[];
  tabLabels: TabLabels;
  testLabels: TestLabels;
  formLabels: FormLabels;
};

export function AgentDetailTabs({
  locale,
  vapiAssistantId,
  agentId,
  agentDefaults,
  totalCalls,
  avgDuration,
  recentCalls,
  tabLabels,
  testLabels,
  formLabels,
}: AgentDetailTabsProps) {
  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">{tabLabels.overview}</TabsTrigger>
        <TabsTrigger value="test">{tabLabels.test}</TabsTrigger>
        <TabsTrigger value="settings">{tabLabels.settings}</TabsTrigger>
        <TabsTrigger value="call-history">{tabLabels.callHistory}</TabsTrigger>
      </TabsList>

      {/* Overview */}
      <TabsContent value="overview" className="space-y-4 pt-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {tabLabels.totalCalls}
              </CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCalls}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {tabLabels.avgDuration}
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {avgDuration > 0 ? `${Math.round(avgDuration)}s` : "—"}
              </div>
            </CardContent>
          </Card>
        </div>
        {totalCalls === 0 && (
          <p className="text-sm text-muted-foreground">
            {tabLabels.noCallsYet}
          </p>
        )}
      </TabsContent>

      {/* Test */}
      <TabsContent value="test" className="pt-4">
        {vapiAssistantId ? (
          <CallWidget
            vapiAssistantId={vapiAssistantId}
            labels={testLabels}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {tabLabels.noCallsYet}
          </p>
        )}
      </TabsContent>

      {/* Settings */}
      <TabsContent value="settings" className="pt-4">
        <AgentForm
          locale={locale}
          mode="edit"
          agentId={agentId}
          defaultValues={agentDefaults}
          labels={formLabels}
        />
      </TabsContent>

      {/* Call History */}
      <TabsContent value="call-history" className="pt-4">
        {recentCalls.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tabLabels.noCallsYet}
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Caller</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCalls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>
                      {new Date(call.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{call.caller_number ?? "—"}</TableCell>
                    <TableCell>
                      {call.duration_seconds != null
                        ? `${call.duration_seconds}s`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{call.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
