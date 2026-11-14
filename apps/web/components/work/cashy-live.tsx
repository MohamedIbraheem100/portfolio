"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { trackEvent } from "@/lib/analytics";
import { CASHY_MODEL_MB, CASHY_SAMPLES, CONFIDENT, MIN_SCORE, denomination } from "@/lib/cashy";
import type { WorkerReply, WorkerRequest } from "@/ml/cashy.worker";
import type { Detection } from "@/ml/yolo";

/*
  Cashy, live (W4, D39). The visitor picks a sample or their own photo of an Egyptian
  banknote and the owner's denomination model names it, in the browser: the model
  (YOLOv8s, about 22 MB) is downloaded once on the first try and runs in a Web Worker
  on WebAssembly. The photo never leaves the device.

  Below the confidence threshold the answer is "Not confident", never a guess (D16).
  Only the denomination is shown: the project's counterfeit model is not part of the
  public demo.
*/

type Phase =
  | { kind: "idle" }
  | { kind: "loading"; percent: number }
  | { kind: "detecting" }
  | { kind: "result"; detections: Detection[] }
  | { kind: "error"; message: string };

const MAX_SIDE = 1280;

export function CashyLive({ modelUrl }: { modelUrl: string }) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const worker = useRef<Worker | null>(null);
  const ready = useRef<Promise<void> | null>(null);
  const waiting = useRef<{ resolve: (r: WorkerReply) => void } | null>(null);

  useEffect(() => () => worker.current?.terminate(), []);

  function ask(message: WorkerRequest, transfer: Transferable[]): Promise<WorkerReply> {
    return new Promise((resolve) => {
      waiting.current = { resolve };
      worker.current?.postMessage(message, transfer);
    });
  }

  /* Download the model once (with real progress) and hand it to the worker. */
  function loadModel(): Promise<void> {
    ready.current ??= (async () => {
      const res = await fetch(modelUrl);
      if (!res.ok || !res.body) throw new Error("The model could not be downloaded. Please try again.");
      const total = Number(res.headers.get("content-length")) || CASHY_MODEL_MB * 1024 * 1024;
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        setPhase({ kind: "loading", percent: Math.min(99, Math.round((received / total) * 100)) });
      }
      setPhase({ kind: "loading", percent: 100 });
      const model = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) {
        model.set(chunk, offset);
        offset += chunk.length;
      }
      const w = new Worker(new URL("../../ml/cashy.worker.ts", import.meta.url), { type: "module" });
      w.onmessage = (event: MessageEvent<WorkerReply>) => waiting.current?.resolve(event.data);
      w.onerror = () => waiting.current?.resolve({ type: "error", message: "The model could not start in this browser." });
      worker.current = w;
      const reply = await ask({ type: "load", model: model.buffer }, [model.buffer]);
      if (reply.type === "error") throw new Error(reply.message);
    })().catch((err) => {
      ready.current = null; // let the next try start again
      throw err;
    });
    return ready.current;
  }

  async function run(source: Blob | string) {
    if (phase.kind === "loading" || phase.kind === "detecting") return;
    trackEvent("run_lab");
    try {
      setPhase(ready.current ? { kind: "detecting" } : { kind: "loading", percent: 0 });
      const blob = typeof source === "string" ? await (await fetch(source)).blob() : source;
      const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
      const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
      const width = Math.round(bitmap.width * scale);
      const height = Math.round(bitmap.height * scale);
      const el = canvas.current;
      const ctx = el?.getContext("2d");
      if (!el || !ctx) throw new Error("This browser cannot show the photo.");
      el.width = width;
      el.height = height;
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      setSize({ width, height });

      await loadModel();
      setPhase({ kind: "detecting" });
      const image = await createImageBitmap(el);
      const reply = await ask({ type: "detect", image, minScore: MIN_SCORE }, [image]);
      if (reply.type === "error") throw new Error(reply.message);
      if (reply.type === "result") setPhase({ kind: "result", detections: reply.detections });
    } catch (err) {
      setPhase({ kind: "error", message: err instanceof Error ? err.message : "That photo could not be read." });
    }
  }

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void run(file);
  }

  const busy = phase.kind === "loading" || phase.kind === "detecting";
  const named =
    phase.kind === "result"
      ? phase.detections.filter((d) => d.score >= CONFIDENT && denomination(d.classId) !== null)
      : [];
  const best = named[0];

  return (
    <div className="rounded-box bg-night-raised p-4 ring-1 ring-phosphor/10 md:p-5">
      <p className="font-display text-lead font-medium text-phosphor">Try it live</p>
      <p className="mt-1 max-w-prose text-small text-dim">
        Pick a banknote or use your own photo. My model names the denomination, in your browser.
      </p>

      <div className={`relative mx-auto mt-4 w-fit max-w-full ${size ? "" : "hidden"}`}>
        <canvas
          ref={canvas}
          className="block h-auto max-h-[26rem] w-auto max-w-full rounded-box"
          aria-label="The photo being analysed"
        />
        {size &&
          named.map((d, i) => (
            <div
              key={i}
              className="hero-box pointer-events-none absolute border-2 border-amber"
              style={{
                left: `${(Math.max(0, d.x) / size.width) * 100}%`,
                top: `${(Math.max(0, d.y) / size.height) * 100}%`,
                width: `${(Math.min(d.width, size.width - Math.max(0, d.x)) / size.width) * 100}%`,
                height: `${(Math.min(d.height, size.height - Math.max(0, d.y)) / size.height) * 100}%`,
              }}
            >
              <span className="absolute -top-px left-0 -translate-y-full bg-amber px-1.5 py-0.5 font-mono text-[0.75rem] leading-tight text-night">
                {denomination(d.classId)} · {d.score.toFixed(2)}
              </span>
            </div>
          ))}
      </div>

      <div className="mt-4 min-h-12" aria-live="polite">
        {busy && (
          <p role="status" className="flex items-center gap-3">
            <span aria-hidden="true" className="fit-spinner block size-4 shrink-0" />
            <span className="status-shimmer font-display text-body font-medium">
              {phase.kind === "detecting"
                ? "Looking at the photo"
                : phase.percent === 100
                  ? "Starting the model"
                  : `Loading the model (${CASHY_MODEL_MB} MB, once) · ${phase.percent}%`}
            </span>
          </p>
        )}
        {phase.kind === "result" && best && (
          <>
            <p className="font-display text-h3 font-medium text-phosphor">{denomination(best.classId)}</p>
            <p className="mt-1 font-mono text-small text-dim">
              confidence {best.score.toFixed(2)} · in your browser, WebAssembly
            </p>
          </>
        )}
        {phase.kind === "result" && !best && (
          <>
            <p className="font-display text-h3 font-medium text-phosphor">Not confident</p>
            <p className="mt-1 max-w-prose text-small text-dim">
              I could not name this note. Try a sharper photo with one Egyptian banknote filling the frame.
            </p>
          </>
        )}
        {phase.kind === "error" && (
          <p role="alert" className="border-l-2 border-amber pl-3 text-small text-phosphor">
            {phase.message}
          </p>
        )}
      </div>

      <ul className="mt-4 grid grid-cols-4 gap-2">
        {CASHY_SAMPLES.map((s) => (
          <li key={s.src}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void run(s.src)}
              aria-label={`Try the ${s.label}`}
              className="block w-full overflow-hidden rounded-box ring-1 ring-phosphor/15 transition hover:ring-amber disabled:opacity-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.src} alt="" loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => picker.current?.click()}
          className="inline-flex h-10 items-center rounded-box border border-phosphor/30 px-4 font-display text-body font-medium leading-none text-phosphor transition-colors hover:border-amber hover:text-amber active:scale-[0.98] disabled:opacity-50"
        >
          Use your own photo
        </button>
        <input ref={picker} type="file" accept="image/*" onChange={onPick} className="sr-only" tabIndex={-1} aria-hidden="true" />
        <p className="text-small text-dim">The photo never leaves your device.</p>
      </div>
      <p className="mt-3 max-w-prose text-small text-dim">
        Denominations only, from 5 to 200 EGP. A graduation-project model (YOLOv8s, Ultralytics, AGPL-3.0), not a
        tool for checking money.
      </p>
    </div>
  );
}
