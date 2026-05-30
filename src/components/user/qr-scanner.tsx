"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { IconCameraOff, IconArrowLeft } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

/**
 * Visual guide size in px. jsQR scans the full video frame regardless,
 * so the amber border is a UX aid, not a constraint.
 */
const SCAN_SIZE = 240;

/** How often to decode a frame (ms). 50 = ~20fps. */
const DECODE_INTERVAL = 50;

interface QrScannerProps {
  onScan: (decodedText: string) => void | Promise<void>;
  onBack: () => void;
  /** Suspend the decode loop (e.g. while a confirmation dialog is open). */
  paused?: boolean;
  /** Text shown below the scan guide. Defaults to "Point at the QR code on staff's device". */
  hint?: string;
}

type ScanState = "initialising" | "scanning" | "permission-denied" | "error";

export function QrScanner({
  onScan,
  onBack,
  paused = false,
  hint = "Point at the QR code on staff's device",
}: QrScannerProps) {
  const [state, setState] = useState<ScanState>("initialising");
  const [errorMsg, setErrorMsg] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastDecodeRef = useRef(0);
  const pausedRef = useRef(false);
  const loopRunningRef = useRef(false);
  const tickRef = useRef<(timestamp: number) => void>(() => {});
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // Sync paused prop → ref; restart loop when unpaused
  useEffect(() => {
    if (paused) {
      pausedRef.current = true;
      // loop will stop itself on next frame (tick returns early)
    } else {
      pausedRef.current = false;
      // Restart loop only if it stopped and we're in scanning state
      if (state === "scanning" && !loopRunningRef.current) {
        loopRunningRef.current = true;
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(tickRef.current);
      }
    }
  }, [paused, state]);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        video.srcObject = stream;
        await video.play();
        if (cancelled) return;

        setState("scanning");

        function tick(timestamp: number) {
          if (pausedRef.current || cancelled) {
            loopRunningRef.current = false;
            return;
          }

          if (timestamp - lastDecodeRef.current >= DECODE_INTERVAL) {
            lastDecodeRef.current = timestamp;
            decode();
          }

          rafRef.current = requestAnimationFrame(tick);
        }

        tickRef.current = tick;
        loopRunningRef.current = true;
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        if (cancelled) return;
        const isDom = err instanceof DOMException;
        const msg = err instanceof Error ? err.message : String(err);
        if (
          (isDom && (err as DOMException).name === "NotAllowedError") ||
          msg.toLowerCase().includes("permission")
        ) {
          setState("permission-denied");
        } else {
          setState("error");
          setErrorMsg(msg);
        }
      }
    }

    function decode() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA)
        return;

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;

      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      const result = jsQR(imageData.data, w, h, {
        inversionAttempts: "attemptBoth",
      });

      if (result && !pausedRef.current) {
        pausedRef.current = true;
        Promise.resolve(onScanRef.current(result.data)).catch(() => {
          // Resume on error (e.g. invalid/expired QR)
          pausedRef.current = false;
          loopRunningRef.current = true;
          rafRef.current = requestAnimationFrame(tickRef.current);
        });
      }
    }

    startCamera();

    return () => {
      // Synchronous — camera light turns off immediately
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // ── Error states ──────────────────────────────────────────────────────────

  if (state === "permission-denied") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center px-8 bg-black">
        <IconCameraOff size={40} className="text-white/40" />
        <p className="font-heading font-bold text-lg text-white">
          Camera access required
        </p>
        <p className="text-sm text-white/60 max-w-xs leading-relaxed">
          Allow camera access in your browser settings, then reload the page.
        </p>
        <Button
          variant="outline"
          onClick={onBack}
          className="border-white/20 text-white hover:bg-white/10 hover:text-white"
        >
          <IconArrowLeft size={16} /> Go back
        </Button>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-center px-8 bg-black">
        <p className="font-heading font-bold text-lg text-white">
          Camera error
        </p>
        <p className="text-sm text-white/60 max-w-xs">{errorMsg}</p>
        <Button
          variant="outline"
          onClick={onBack}
          className="border-white/20 text-white hover:bg-white/10 hover:text-white"
        >
          <IconArrowLeft size={16} /> Go back
        </Button>
      </div>
    );
  }

  // ── Camera view ───────────────────────────────────────────────────────────

  return (
    <div className="w-full h-full relative bg-black overflow-hidden">
      {/* Camera feed — object-cover fills the container at any aspect ratio */}
      <video
        ref={videoRef}
        playsInline
        muted
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Off-screen canvas used only for jsQR frame capture */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* Spinner while camera initialises */}
      {state === "initialising" && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        </div>
      )}

      {/* Single overlay: box-shadow spreads outward to darken everything outside the
          scan guide. The box itself is transparent so the camera shows through with
          rounded corners matching the amber border. */}
      {state === "scanning" && (
        <>
          <div
            className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center"
            aria-hidden="true"
          >
            <div
              className="border-2 border-primary rounded-2xl shrink-0"
              style={{
                width: SCAN_SIZE,
                height: SCAN_SIZE,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
              }}
            />
          </div>

          {/* Hint below the scan guide */}
          <div
            className="absolute inset-x-0 flex justify-center z-20 pointer-events-none"
            style={{ top: `calc(50% + ${SCAN_SIZE / 2}px + 18px)` }}
          >
            <p className="text-white/60 text-sm text-center px-4">{hint}</p>
          </div>
        </>
      )}
    </div>
  );
}
