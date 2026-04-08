"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

type Props = {
  recordingUrl: string | null;
  labels: {
    recording: string;
    noRecording: string;
    download: string;
  };
};

export function CallRecording({ recordingUrl, labels }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{labels.recording}</CardTitle>
      </CardHeader>
      <CardContent>
        {recordingUrl ? (
          <div className="space-y-3">
            <audio controls src={recordingUrl} className="w-full" />
            <a href={recordingUrl} download target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                {labels.download}
              </Button>
            </a>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{labels.noRecording}</p>
        )}
      </CardContent>
    </Card>
  );
}
