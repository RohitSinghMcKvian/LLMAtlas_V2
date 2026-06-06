"use client";

import { Mic, MicOff, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

type RecordingState = "idle" | "listening" | "processing";

// Browser SpeechRecognition types
interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  readonly isFinal: boolean;
}
interface SpeechRecognitionAlternative { readonly transcript: string; readonly confidence: number; }
interface SpeechRecognitionResultList { readonly length: number; [index: number]: SpeechRecognitionResult; }
interface SpeechRecognitionEvent extends Event { readonly results: SpeechRecognitionResultList; }
interface SpeechRecognitionErrorEvent extends Event { readonly error: string; }
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
interface SpeechRecognitionConstructor { new(): SpeechRecognitionInstance; }

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

export function VoiceInputButton({ onTranscript, disabled }: Props) {
  const [state, setState] = useState<RecordingState>("idle");
  // Defer supported check to client to avoid SSR hydration mismatch
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    setSupported("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const toggle = useCallback(() => {
    if (!supported) {
      toast.error("Speech recognition not supported in this browser. Try Chrome or Edge.");
      return;
    }
    if (state === "listening") {
      recognitionRef.current?.stop();
      setState("idle");
      return;
    }

    const SR = (window.SpeechRecognition || window.webkitSpeechRecognition) as SpeechRecognitionConstructor;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setState("listening");
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      if (e.results[e.results.length - 1].isFinal) {
        onTranscript(transcript);
        setState("idle");
      }
    };
    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== "aborted") toast.error(`Microphone error: ${e.error}`);
      setState("idle");
    };
    recognition.onend = () => setState("idle");

    recognitionRef.current = recognition;
    recognition.start();
  }, [state, supported, onTranscript]);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      title={state === "listening" ? "Stop recording" : "Voice input"}
      className={cn(
        "relative p-1.5 rounded-md transition-all",
        state === "listening"
          ? "text-red-500 bg-red-500/10 hover:bg-red-500/20"
          : "text-muted-foreground hover:text-foreground hover:bg-accent",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      {state === "processing" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : state === "listening" ? (
        <>
          <MicOff className="h-4 w-4" />
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-md animate-ping bg-red-500/20 pointer-events-none" />
        </>
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </button>
  );
}
