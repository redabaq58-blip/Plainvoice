import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type SmsHistoryItem = {
  id: string;
  recipient: string | null;
  sender: string | null;
  body: string;
  status: string;
  message_type: string;
  call_id: string | null;
  error: string | null;
  created_at: string;
};

type Labels = {
  title: string;
  empty: string;
  timestamp: string;
  recipient: string;
  sender: string;
  type: string;
  status: string;
  body: string;
  error: string;
  openCall: string;
  statusLabels: Record<string, string>;
  typeLabels: Record<string, string>;
};

type Props = {
  locale: string;
  messages: SmsHistoryItem[];
  labels: Labels;
  showCallLink?: boolean;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  sent: "default",
  failed: "destructive",
  skipped: "secondary",
};

function formatDateTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function SmsHistoryCard({ locale, messages, labels, showCallLink = false }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <MessageSquareText className="h-4 w-4" />
          {labels.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.timestamp}</TableHead>
                <TableHead>{labels.recipient}</TableHead>
                <TableHead>{labels.sender}</TableHead>
                <TableHead>{labels.type}</TableHead>
                <TableHead>{labels.status}</TableHead>
                <TableHead>{labels.body}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(message.created_at, locale)}
                  </TableCell>
                  <TableCell>{message.recipient ?? "-"}</TableCell>
                  <TableCell>{message.sender ?? "-"}</TableCell>
                  <TableCell>
                    {labels.typeLabels[message.message_type] ?? message.message_type}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[message.status] ?? "outline"}>
                      {labels.statusLabels[message.status] ?? message.status}
                    </Badge>
                    {message.error && (
                      <p className="mt-1 text-xs text-destructive">
                        {labels.error}: {message.error}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="max-w-md whitespace-normal">
                    <p>{message.body}</p>
                    {showCallLink && message.call_id && (
                      <Link
                        href={`/${locale}/calls/${message.call_id}`}
                        className="mt-1 inline-block text-xs text-muted-foreground hover:text-foreground"
                      >
                        {labels.openCall}
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
