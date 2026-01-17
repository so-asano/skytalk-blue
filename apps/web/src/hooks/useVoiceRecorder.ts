"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface UseVoiceRecorderOptions {
  maxDuration?: number; // milliseconds, default 60000 (1 minute)
  onTranscript?: (text: string) => void;
  lang?: string; // e.g., "ja-JP" or "en-US"
}

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  recordingTime: number; // seconds
  formattedTime: string; // "0:00" format
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<File | null>;
  error: string | null;
  isSupported: boolean;
}

// Check if SpeechRecognition is available
const getSpeechRecognition = (): SpeechRecognitionConstructor | null => {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};

// Create audio file from recorded blob
function createAudioFile(blob: Blob, mimeType: string): File {
  // Normalize mimeType (remove codecs info like "audio/webm;codecs=opus")
  const baseMimeType = mimeType.split(";")[0];
  const ext = baseMimeType.includes("webm") ? "webm" : "m4a";
  // Use normalized mimeType for the File to pass ALLOWED_TYPES check
  const normalizedType = baseMimeType.includes("webm") ? "audio/webm" : "audio/mp4";
  return new File([blob], `recording-${Date.now()}.${ext}`, { type: normalizedType });
}

// Format seconds to "M:SS" format
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}): UseVoiceRecorderReturn {
  const { maxDuration = 60000, onTranscript, lang = "ja-JP" } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptRef = useRef<string>("");

  // Check browser support
  const isSupported =
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    !!window.MediaRecorder;

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors when stopping
      }
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError("Recording is not supported in this browser");
      return;
    }

    setError(null);
    transcriptRef.current = "";

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setRecordingTime(elapsed);

        // Auto-stop at max duration
        if (elapsed >= maxDuration / 1000) {
          stopRecording();
        }
      }, 1000);

      // Start speech recognition if available
      const SpeechRecognitionClass = getSpeechRecognition();
      if (SpeechRecognitionClass && onTranscript) {
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;

        recognition.onresult = (event) => {
          let finalTranscript = "";
          let interimTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              interimTranscript += result[0].transcript;
            }
          }

          if (finalTranscript) {
            transcriptRef.current += finalTranscript;
            onTranscript(transcriptRef.current);
          } else if (interimTranscript) {
            onTranscript(transcriptRef.current + interimTranscript);
          }
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
        };

        try {
          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.error("Failed to start speech recognition:", e);
        }
      }
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Failed to access microphone");
      cleanup();
    }
  }, [isSupported, maxDuration, onTranscript, lang, cleanup]);

  const stopRecording = useCallback(async (): Promise<File | null> => {
    if (!mediaRecorderRef.current || !isRecording) {
      return null;
    }

    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType;
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioFile = createAudioFile(audioBlob, mimeType);
        cleanup();
        setIsRecording(false);
        setRecordingTime(0);
        resolve(audioFile);
      };

      mediaRecorder.stop();
    });
  }, [isRecording, cleanup]);

  return {
    isRecording,
    recordingTime,
    formattedTime: formatTime(recordingTime),
    startRecording,
    stopRecording,
    error,
    isSupported,
  };
}
