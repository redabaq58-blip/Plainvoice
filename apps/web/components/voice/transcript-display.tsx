"use client";

import { useEffect, useRef } from "react";

export type TranscriptMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

type TranscriptDisplayProps = {
  messages: TranscriptMessage[];
};

export function TranscriptDisplay({ messages }: TranscriptDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      className="mt-4 h-48 space-y-2 overflow-y-auto rounded-md border p-3"
    >
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
        >
          <div
            className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
              msg.role === "user"
                ? "bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}
    </div>
  );
}
