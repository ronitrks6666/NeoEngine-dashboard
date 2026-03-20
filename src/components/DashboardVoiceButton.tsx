import { useState, useRef, useCallback, useEffect } from 'react';

import { Mic, Check, X, Loader2 } from 'lucide-react';

import { voiceApi, type VoiceToNavResult } from '@/api/voice';

import { getApiErrorMessage } from '@/api/auth';



/** How many vertical samples in the scrolling strip (time → left to right = past → now). */

const WAVEFORM_HISTORY_LENGTH = 96;

/** Min bar height (px) — silence */

const BAR_MIN_PX = 2;

/** Attack: how fast the meter jumps toward loud (0–1, higher = snappier) */

const ATTACK = 0.55;

/** Release: multiplier per frame @ ~60fps — lower = peaks drop faster when you stop talking */

const RELEASE = 0.82;

/** Ms between shifting the history left — higher = slower, calmer sweep (less motion blur). */

const SCROLL_SAMPLE_MS = 88;



function computeRmsLevel(analyser: AnalyserNode): number {

  const buffer = new Uint8Array(analyser.fftSize);

  analyser.getByteTimeDomainData(buffer);

  let sum = 0;

  for (let i = 0; i < buffer.length; i++) {

    const v = (buffer[i] - 128) / 128;

    sum += v * v;

  }

  const rms = Math.sqrt(sum / buffer.length);

  return Math.min(100, rms * 280);

}



function drawWaveform(canvas: HTMLCanvasElement, history: Float32Array) {

  const ctx = canvas.getContext('2d');

  if (!ctx) return;



  const dpr = window.devicePixelRatio || 1;

  const w = canvas.clientWidth;

  const h = canvas.clientHeight;

  if (w <= 0 || h <= 0) return;



  const targetW = Math.floor(w * dpr);

  const targetH = Math.floor(h * dpr);

  if (canvas.width !== targetW || canvas.height !== targetH) {

    canvas.width = targetW;

    canvas.height = targetH;

  }



  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, w, h);



  const n = history.length;

  const gap = 2;

  const barW = Math.max(1, (w - gap * (n - 1)) / n);

  const maxBarH = h - 2;



  for (let i = 0; i < n; i++) {

    const t = history[i] / 100;

    const barH = BAR_MIN_PX + t * (maxBarH - BAR_MIN_PX);

    const x = i * (barW + gap);

    const y = h - barH;



    const g = ctx.createLinearGradient(x, y, x, h);

    g.addColorStop(0, `rgba(209, 250, 229, ${0.35 + t * 0.55})`);

    g.addColorStop(0.45, `rgba(52, 211, 153, ${0.55 + t * 0.4})`);

    g.addColorStop(1, `rgba(5, 150, 105, ${0.75 + t * 0.25})`);

    ctx.fillStyle = g;

    const radius = Math.min(barW / 2, 4);

    ctx.beginPath();

    if (typeof ctx.roundRect === 'function') {

      ctx.roundRect(x, y, barW, barH, radius);

    } else {

      ctx.rect(x, y, barW, barH);

    }

    ctx.fill();

  }

}



interface DashboardVoiceButtonProps {

  onResult: (result: VoiceToNavResult) => void;

  outletId?: string | null;

  onError?: (err: string) => void;

  disabled?: boolean;

  className?: string;

}



export function DashboardVoiceButton({

  onResult,

  outletId,

  onError,

  disabled = false,

  className = '',

}: DashboardVoiceButtonProps) {

  const [recording, setRecording] = useState(false);

  const [processing, setProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const streamRef = useRef<MediaStream | null>(null);

  const analyserRef = useRef<AnalyserNode | null>(null);

  const animationRef = useRef<number | null>(null);

  const chunksRef = useRef<Blob[]>([]);

  const shouldSubmitRef = useRef(false);



  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const historyRef = useRef<Float32Array>(new Float32Array(WAVEFORM_HISTORY_LENGTH));

  const smoothedLevelRef = useRef(0);

  const lastScrollTimeRef = useRef(0);



  /** rAF loop: level updates every frame; history scrolls slowly to avoid blur */

  useEffect(() => {

    if (!recording) return;



    historyRef.current.fill(0);

    smoothedLevelRef.current = 0;

    lastScrollTimeRef.current = performance.now();



    const tick = () => {

      const now = performance.now();

      const analyser = analyserRef.current;

      const raw = analyser ? computeRmsLevel(analyser) : 0;

      let s = smoothedLevelRef.current;

      if (raw > s) {

        s += (raw - s) * ATTACK;

      } else {

        s *= RELEASE;

      }

      if (s < 0.15) s = 0;

      smoothedLevelRef.current = s;



      const hist = historyRef.current;

      const len = hist.length;

      if (now - lastScrollTimeRef.current >= SCROLL_SAMPLE_MS) {

        for (let i = 0; i < len - 1; i++) {

          hist[i] = hist[i + 1];

        }

        lastScrollTimeRef.current = now;

      }

      hist[len - 1] = s;



      const canvas = waveCanvasRef.current;

      if (canvas) {

        drawWaveform(canvas, hist);

      }



      animationRef.current = requestAnimationFrame(tick);

    };



    animationRef.current = requestAnimationFrame(tick);

    return () => {

      if (animationRef.current !== null) {

        cancelAnimationFrame(animationRef.current);

        animationRef.current = null;

      }

    };

  }, [recording]);



  const stopStream = useCallback(() => {

    streamRef.current?.getTracks().forEach((t) => t.stop());

    streamRef.current = null;

    analyserRef.current = null;

    historyRef.current.fill(0);

    smoothedLevelRef.current = 0;

    const c = waveCanvasRef.current;

    if (c) {

      const ctx = c.getContext('2d');

      if (ctx) ctx.clearRect(0, 0, c.width, c.height);

    }

  }, []);



  const startRecording = useCallback(async () => {

    try {

      if (typeof window === 'undefined' || !window.isSecureContext) {

        onError?.('Microphone requires a secure connection (HTTPS).');

        return;

      }

      if (!navigator.mediaDevices?.getUserMedia) {

        onError?.('Microphone is not supported in this browser.');

        return;

      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      streamRef.current = stream;



      const audioContext = new AudioContext();

      const analyser = audioContext.createAnalyser();

      analyser.fftSize = 1024;

      analyser.smoothingTimeConstant = 0.3;

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

          setProcessing(true);

          voiceApi

            .toNav(blob, outletId)

            .then((result) => {

              onResult(result);

            })

            .catch((err) => {

              const msg = getApiErrorMessage(err) || 'Voice processing failed';

              onError?.(msg);

            })

            .finally(() => {

              setProcessing(false);

            });

        } else if (shouldSubmitRef.current && chunksRef.current.length === 0) {

          onError?.('No audio recorded');

        }

      };



      recorder.start(100);

      setRecording(true);

    } catch (err) {

      const msg = err instanceof Error ? err.message : 'Failed to access microphone';

      const name = err instanceof Error && 'name' in err ? (err as DOMException).name : '';

      if (name === 'NotAllowedError' || msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {

        onError?.('Microphone access denied. Please allow microphone permission.');

      } else if (name === 'NotFoundError' || msg.toLowerCase().includes('not found')) {

        onError?.('No microphone found. Please connect a microphone.');

      } else if (msg.toLowerCase().includes('secure') || msg.toLowerCase().includes('https')) {

        onError?.('Microphone requires a secure connection (HTTPS).');

      } else {

        onError?.(msg);

      }

    }

  }, [onResult, onError, outletId, stopStream]);



  const stopRecording = useCallback(

    (submit: boolean) => {

      shouldSubmitRef.current = submit;

      const recorder = mediaRecorderRef.current;

      if (recorder && recorder.state !== 'inactive') {

        recorder.stop();

      } else if (!submit) {

        stopStream();

        setRecording(false);

      }

    },

    [stopStream]

  );



  const handleStart = () => {

    if (disabled || processing) return;

    startRecording();

  };



  const handleSubmit = () => stopRecording(true);

  const handleCancel = () => stopRecording(false);



  if (typeof window !== 'undefined' && !window.MediaRecorder) {

    return null;

  }



  if (processing) {

    return (

      <div

        className={`flex h-10 items-center gap-2 shrink-0 rounded-xl border border-amber-200/90 bg-amber-50/95 px-3 shadow-sm ${className}`}

      >

        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-600" />

        <span className="text-sm font-medium leading-none text-amber-800">Processing…</span>

      </div>

    );

  }



  if (recording) {

    return (

      <div

        className={`flex h-10 max-h-10 min-h-[2.5rem] w-full min-w-0 max-w-[min(100vw-2rem,40rem)] items-center gap-2 sm:gap-3 ${className}`}

        role="status"

        aria-live="polite"

        aria-label="Speaking — cancel or confirm"

      >

        <span className="shrink-0 text-sm font-semibold leading-none text-emerald-800">

          Speaking

        </span>

        <div className="box-border flex min-h-0 min-w-0 flex-1 h-10 max-h-10 rounded-xl border border-emerald-200/90 bg-gradient-to-b from-white to-emerald-50/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_1px_2px_rgba(16,185,129,0.12)] ring-1 ring-emerald-100/70">

          <div

            className="relative min-h-0 h-full w-full overflow-hidden rounded-[11px] bg-gradient-to-b from-emerald-100/20 via-white to-emerald-50/25 px-1"

            style={{

              maskImage: 'linear-gradient(90deg, transparent 0%, black 6%, black 94%, transparent 100%)',

              WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 6%, black 94%, transparent 100%)',

            }}

          >

            <div className="pointer-events-none absolute bottom-1 left-2 right-2 z-[1] h-px bg-gradient-to-r from-transparent via-emerald-300/35 to-transparent" />

            <canvas

              ref={waveCanvasRef}

              className="block h-full w-full min-h-0"

              aria-hidden

            />

          </div>

        </div>



        <button

          type="button"

          onClick={handleCancel}

          className="shrink-0 flex h-9 w-9 items-center justify-center self-center rounded-lg border border-slate-200/90 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"

          title="Cancel"

          aria-label="Cancel recording"

        >

          <X className="h-4 w-4 stroke-[2.25]" />

        </button>

        <button

          type="button"

          onClick={handleSubmit}

          className="shrink-0 flex h-9 w-9 items-center justify-center self-center rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/20 transition hover:from-emerald-600 hover:to-emerald-700"

          title="Submit"

          aria-label="Submit recording"

        >

          <Check className="h-4 w-4 stroke-[2.5]" />

        </button>

      </div>

    );

  }



  return (

    <button

      type="button"

      onClick={handleStart}

      disabled={disabled || processing}

      title="Speak to navigate or create (e.g. 'Show staff', 'Create a task to clean tables every 1 hour assigned to waiter')"

      className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-700 transition-all hover:bg-emerald-100 ${className} ${disabled || processing ? 'cursor-not-allowed opacity-50' : ''}`}

    >

      <Mic className="h-4 w-4" />

      Speak

    </button>

  );

}

