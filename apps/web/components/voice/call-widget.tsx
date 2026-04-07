"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import { Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TranscriptDisplay,
  type TranscriptMessage,
} from "@/components/voice/transcript-display";

type CallState = "idle" | "connecting" | "active" | "ended";

type CallWidgetProps = {
  vapiAssistantId: string;
  labels: {
    start: string;
    end: string;
    connecting: string;
    active: string;
    idle: string;
    ended: string;
  };
};

export function CallWidget({ vapiAssistantId, labels }: CallWidgetProps) {
  const vapiRef = useRef<Vapi | null>(null);
  const [callState, setCallState] = useState<CallState>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    if (!publicKey) return;

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      setCallState("active");
      setError(null);
    });

    vapi.on("call-end", () => {
      setCallState("ended");
      setIsSpeaking(false);
      setVolumeLevel(0);
    });

    vapi.on("speech-start", () => setIsSpeaking(true));
    vapi.on("speech-end", () => setIsSpeaking(false));

    vapi.on("volume-level", (level: number) => {
      setVolumeLevel(level);
    });

    vapi.on("message", (message: Record<string, unknown>) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const role = message.role as "user" | "assistant";
        const content = message.transcript as string;
        if (content) {
          setMessages((prev) => [
            ...prev,
            { role, content, timestamp: Date.now() },
          ]);
        }
      }
    });

    vapi.on("error", (err: unknown) => {
      console.error("Vapi error:", err);
      setError(String(err));
      setCallState("idle");
    });

    return () => {
      vapi.stop();
    };
  }, []);

  const startCall = useCallback(async () => {
    if (!vapiRef.current || !vapiAssistantId) return;
    setCallState("connecting");
    setMessages([]);
    setError(null);
    try {
      await vapiRef.current.start(vapiAssistantId);
    } catch (err) {
      console.error("Failed to start call:", err);
      setError(String(err));
      setCallState("idle");
    }
  }, [vapiAssistantId]);

  const endCall = useCallback(() => {
    vapiRef.current?.stop();
  }, []);

  const statusText =
    callState === "connecting"
      ? labels.connecting
      : callState === "active"
        ? labels.active
        : callState === "ended"
          ? labels.ended
          : labels.idle;

  return (
    <div className="flex flex-col items-center space-y-6 py-8">
      {/* Orb */}
      <div className="relative flex h-32 w-32 items-center justify-center">
        {/* Outer ring */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-500 ${
            callState === "active"
              ? isSpeaking
                ? "scale-110 bg-green-500/20"
                : "scale-100 bg-green-500/10"
              : callState === "connecting"
                ? "animate-pulse bg-yellow-500/10"
                : "bg-muted/20"
          }`}
        />
        {/* Middle ring */}
        <div
          className={`absolute inset-3 rounded-full transition-all duration-300 ${
            callState === "active"
              ? isSpeaking
                ? "scale-105 bg-green-500/30"
                : "bg-green-500/20"
              : callState === "connecting"
                ? "animate-pulse bg-yellow-500/20"
                : "bg-muted/30"
          }`}
          style={
            callState === "active"
              ? { transform: `scale(${1 + volumeLevel * 0.2})` }
              : undefined
          }
        />
        {/* Inner orb */}
        <div
          className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full transition-all duration-200 ${
            callState === "active"
              ? "bg-green-500 shadow-lg shadow-green-500/50"
              : callState === "connecting"
                ? "animate-pulse bg-yellow-500"
                : callState === "ended"
                  ? "bg-muted"
                  : "bg-muted-foreground/20"
          }`}
          style={
            callState === "active" && isSpeaking
              ? { transform: `scale(${1 + volumeLevel * 0.3})` }
              : undefined
          }
        >
          {callState === "active" || callState === "connecting" ? (
            <Phone className="h-6 w-6 text-white" />
          ) : (
            <Phone className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Status */}
      <p className="text-sm font-medium text-muted-foreground">{statusText}</p>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Controls */}
      <div>
        {callState === "idle" || callState === "ended" ? (
          <Button onClick={startCall} className="gap-2">
            <Phone className="h-4 w-4" />
            {labels.start}
          </Button>
        ) : (
          <Button
            onClick={endCall}
            variant="destructive"
            className="gap-2"
            disabled={callState === "connecting"}
          >
            <PhoneOff className="h-4 w-4" />
            {labels.end}
          </Button>
        )}
      </div>

      {/* Transcript */}
      <div className="w-full max-w-md">
        <TranscriptDisplay messages={messages} />
      </div>
    </div>
  );
}
