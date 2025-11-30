"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, StopCircle, Loader2 } from "lucide-react";
import clsx from "clsx";
import type { VoiceCaptureResult } from "@/lib/types";

interface VoiceRecorderProps {
  onCapture: (result: VoiceCaptureResult) => void;
  disabled?: boolean;
}

export function VoiceRecorder({ onCapture, disabled }: VoiceRecorderProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startAtRef = useRef<number | null>(null);

  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    if (!recording) return;
    const interval = window.setInterval(() => {
      if (startAtRef.current) {
        setDuration(Date.now() - startAtRef.current);
      }
    }, 100);
    return () => window.clearInterval(interval);
  }, [recording]);

  const reset = useCallback(() => {
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
    chunksRef.current = [];
    startAtRef.current = null;
    setRecording(false);
    setDuration(0);
  }, []);

  const handleStop = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  const startRecording = useCallback(async () => {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      recorderRef.current = recorder;
      chunksRef.current = [];
      startAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const base64Audio = await blobToBase64(blob);
        const blobUrl = URL.createObjectURL(blob);
        const durationMs = startAtRef.current
          ? Date.now() - startAtRef.current
          : 0;

        onCapture({
          base64Audio,
          blobUrl,
          mimeType: "audio/webm",
          durationMs,
        });

        reset();
      };

      recorder.start();
      setRecording(true);
    } catch (error) {
      console.error("Unable to access microphone", error);
      setPermissionError("Microphone access denied");
      reset();
    }
  }, [onCapture, reset]);

  useEffect(() => {
    return () => reset();
  }, [reset]);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={recording ? handleStop : startRecording}
        disabled={disabled}
        className={clsx(
          "relative flex h-16 w-16 items-center justify-center rounded-full transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
          disabled
            ? "cursor-not-allowed bg-slate-700/40"
            : recording
              ? "bg-rose-500 text-white shadow-[0_8px_40px_-12px_rgba(244,63,94,0.8)]"
              : "bg-slate-800 text-slate-100 hover:bg-slate-700",
        )}
        aria-label={recording ? "Stop recording" : "Start recording"}
      >
        <AnimatePresence mode="wait" initial={false}>
          {recording ? (
            <motion.span
              key="stop-icon"
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }}
            >
              <StopCircle className="h-7 w-7" />
            </motion.span>
          ) : (
            <motion.span
              key="mic-icon"
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }}
            >
              {disabled ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : (
                <Mic className="h-7 w-7" />
              )}
            </motion.span>
          )}
        </AnimatePresence>
        <motion.span
          layoutId="pulse"
          className="absolute inset-0 rounded-full ring-2 ring-transparent"
          animate={
            recording
              ? {
                  boxShadow:
                    "0 0 0 0 rgba(244,63,94,0.6), 0 0 0 12px rgba(244,63,94,0)",
                }
              : { boxShadow: "0 0 0 0 rgba(244,63,94,0)" }
          }
          transition={{
            duration: 1.6,
            repeat: recording ? Infinity : 0,
          }}
        />
      </button>

      <AnimatePresence>
        {recording && (
          <motion.span
            key="duration"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="text-xs font-medium tracking-wider text-rose-200"
          >
            REC {Math.max(0, duration / 1000).toFixed(1)}s
          </motion.span>
        )}
      </AnimatePresence>

      {permissionError && (
        <p className="text-xs text-rose-300">{permissionError}</p>
      )}
    </div>
  );
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onloadend = () => {
      const base64 = (reader.result as string)?.split(",")?.[1];
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}
