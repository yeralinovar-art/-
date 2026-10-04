"use client";

import { useEffect, useRef, useState } from "react";

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

/**
 * Сканер штрихкода камерой. На iPhone встроенного BarcodeDetector нет —
 * подгружаем его реализацию (zxing-wasm) только когда сканер открыт.
 */
export function BarcodeScanner({ onCode }: { onCode: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"starting" | "scanning" | "error">("starting");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    async function start() {
      try {
        const native = (globalThis as { BarcodeDetector?: new (o: object) => Detector }).BarcodeDetector;
        const Impl = native ?? (await import("barcode-detector/ponyfill")).BarcodeDetector;
        const detector = new Impl({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] }) as Detector;

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 } },
          audio: false,
        });
        const video = videoRef.current;
        if (!video || stopped) return;
        video.srcObject = stream;
        await video.play();
        setStatus("scanning");

        const tick = async () => {
          if (stopped) return;
          try {
            const codes = await detector.detect(video);
            const code = codes.find((c) => /^\d{6,14}$/.test(c.rawValue))?.rawValue;
            if (code) {
              navigator.vibrate?.(50);
              onCode(code);
              return;
            }
          } catch {
            // кадр не распознан — пробуем следующий
          }
          timer = setTimeout(tick, 250);
        };
        tick();
      } catch (e) {
        setStatus("error");
        setMessage(
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "Нет доступа к камере. Разрешите его в настройках или введите цифры вручную."
            : "Камера недоступна. Введите цифры штрихкода вручную.",
        );
      }
    }
    start();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode]);

  if (status === "error") return <p className="rounded-2xl bg-card-muted px-4 py-3 text-sm text-muted">{message}</p>;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full object-cover" />
      <div className="pointer-events-none absolute inset-x-8 top-1/2 h-20 -translate-y-1/2 rounded-xl border-2 border-white/80" />
      <p className="absolute inset-x-0 bottom-2 text-center text-sm text-white/90">
        {status === "starting" ? "Включаю камеру…" : "Наведите на штрихкод"}
      </p>
    </div>
  );
}
