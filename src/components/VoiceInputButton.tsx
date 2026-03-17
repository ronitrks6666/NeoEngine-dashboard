import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Check, X, Loader2 } from 'lucide-react';

interface VoiceInputButtonProps {
  onResult: (blob: Blob) => void;
  onError?: (err: string) => void;
  disabled?: boolean;
  processing?: boolean;
  className?: string;
}

export function VoiceInputButton({ onResult, onError, disabled, processing = false, className = '' }: VoiceInputButtonProps) {
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const shouldSubmitRef = useRef(false);
  const [levels, setLevels] = useState<number[]>(Array(12).fill(0));

  const updateLevels = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const barCount = 12;
    const step = Math.floor(dataArray.length / barCount);
    const newLevels: number[] = [];
    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += dataArray[i * step + j] || 0;
      }
      const avg = sum / step;
      newLevels.push(Math.min(100, (avg / 128) * 100));
    }
    setLevels(newLevels);
    animationRef.current = requestAnimationFrame(updateLevels);
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    analyserRef.current = null;
    setLevels(Array(12).fill(0));
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stopStream();
        setRecording(false);
        if (shouldSubmitRef.current && chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          onResult(blob);
        } else if (shouldSubmitRef.current && chunksRef.current.length === 0) {
          onError?.('No audio recorded');
        }
      };

      recorder.start(100);
      setRecording(true);
      updateLevels();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to access microphone';
      if (msg.includes('Permission') || msg.includes('denied')) {
        onError?.('Microphone access denied. Please allow microphone permission.');
      } else {
        onError?.(msg);
      }
    }
  }, [onResult, onError, stopStream, updateLevels]);

  const stopRecording = useCallback((submit: boolean) => {
    shouldSubmitRef.current = submit;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    } else if (!submit) {
      stopStream();
      setRecording(false);
    }
  }, [stopStream]);

  const handleStart = () => {
    if (disabled) return;
    startRecording();
  };

  const handleSubmit = () => stopRecording(true);
  const handleCancel = () => stopRecording(false);

  if (typeof window !== 'undefined' && !window.MediaRecorder) {
    return null;
  }

  if (processing) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
        <span className="text-sm font-medium text-amber-700">Processing voice...</span>
      </div>
    );
  }

  if (recording) {
    return (
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 ${className}`}>
        <div className="flex items-end gap-0.5 h-6">
          {levels.map((level, i) => (
            <div
              key={i}
              className="w-1.5 bg-red-500 rounded-full transition-all duration-75 ease-out"
              style={{ height: `${Math.max(4, 4 + (level / 100) * 20)}px` }}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-red-700">Recording...</span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
            title="Cancel"
            aria-label="Cancel recording"
          >
            <X className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"
            title="Submit"
            aria-label="Submit recording"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleStart}
      disabled={disabled || processing}
      title="Speak to fill task (Hindi/English)"
      className={`flex items-center gap-2 px-3 py-2 rounded-xl font-medium text-sm transition-all ${className} bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 ${disabled || processing ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <Mic className="h-4 w-4" />
      Voice
    </button>
  );
}
