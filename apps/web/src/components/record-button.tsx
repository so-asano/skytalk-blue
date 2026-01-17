"use client";

import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

interface RecordButtonProps {
  onRecordingComplete: (file: File) => void;
  onRecordingStart?: () => void;
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function RecordButton({
  onRecordingComplete,
  onRecordingStart,
  onTranscript,
  disabled,
}: RecordButtonProps) {
  const { t, locale } = useI18n();
  const {
    isRecording,
    formattedTime,
    startRecording,
    stopRecording,
    error,
    isSupported,
  } = useVoiceRecorder({
    maxDuration: 60000,
    onTranscript,
    lang: locale === "ja" ? "ja-JP" : "en-US",
  });

  const handleClick = async () => {
    if (isRecording) {
      const file = await stopRecording();
      if (file) {
        onRecordingComplete(file);
      }
    } else {
      onRecordingStart?.();
      await startRecording();
    }
  };

  // Show error toast if any
  if (error) {
    toast.error(error);
  }

  if (!isSupported) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        title={t("recording.notSupported")}
      >
        <Mic className="w-4 h-4 opacity-50" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={disabled}
      className={isRecording ? "text-red-500 border-red-500 gap-1.5" : ""}
    >
      {isRecording ? (
        <>
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs font-mono">{formattedTime}</span>
        </>
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </Button>
  );
}
