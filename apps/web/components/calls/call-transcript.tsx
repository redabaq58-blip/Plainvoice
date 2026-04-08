"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TranscriptEntry = {
  role: string;
  content: string;
};

type Props = {
  transcript: TranscriptEntry[] | null;
  labels: {
    transcript: string;
    noTranscript: string;
  };
};

export function CallTranscript({ transcript, labels }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{labels.transcript}</CardTitle>
      </CardHeader>
      <CardContent>
        {!transcript || transcript.length === 0 ? (
          <p className="text-sm text-muted-foreground">{labels.noTranscript}</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {transcript.map((entry, i) => (
              <div
                key={i}
                className={`flex ${entry.role === "user" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    entry.role === "user"
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  <div className="mb-1 text-xs font-medium opacity-70 capitalize">
                    {entry.role}
                  </div>
                  {entry.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
