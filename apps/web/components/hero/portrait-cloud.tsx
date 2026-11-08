"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { headBox, loadPoints, type PointData } from "@/lib/pcp3";

/*
  Progressive hero (W5). The static still (children) renders first and is the
  LCP element. After the page is idle this component decides whether to go live:

  - prefers-reduced-motion   -> stay static (motion rule 5)
  - no WebGL                 -> stay static (motion rule 6)
  - coarse pointer (phones)  -> live with half the points, no parallax

  When the first WebGL frame is drawn the still fades out while the points
  assemble into the same portrait; then the amber box locks onto the head with
  real telemetry only: point count, measured assemble time, measured fps.
*/

const PointCloudPortrait = dynamic(() => import("@/three/PointCloudPortrait"), { ssr: false });

type Phase = "static" | "loading" | "live" | "locked";

function supportsWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function useFps(enabled: boolean): number {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      frames++;
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);
  return fps;
}

export function PortraitCloud({ children }: { children: ReactNode }) {
  const figure = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("static");
  const [data, setData] = useState<PointData | null>(null);
  const [parallax, setParallax] = useState(true);
  const [active, setActive] = useState(true);
  const [assembleMs, setAssembleMs] = useState<number | null>(null);
  const fps = useFps(phase === "live" || phase === "locked");

  // Decide and load after the page is idle, never in the LCP path.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !supportsWebGL()) return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const controller = new AbortController();
    const start = () => {
      setParallax(!coarse);
      setPhase("loading");
      loadPoints(coarse ? "/portrait-20k.pcp3" : "/portrait-40k.pcp3", controller.signal)
        .then(setData)
        .catch(() => setPhase("static"));
    };
    // Go live on the visitor's first gesture (most desktops: within a second), or 3 s after the
    // page is idle. Parsing three.js and building 40k points costs ~0.5 s of main thread on a
    // slow phone; tying it to a gesture or a late timer keeps it out of the page's load metrics.
    let fired = false;
    let timer = 0;
    const events: Array<keyof WindowEventMap> = ["pointermove", "pointerdown", "scroll", "keydown", "touchstart"];
    const fire = () => {
      if (fired) return;
      fired = true;
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, fire));
      start();
    };
    const arm = () => {
      events.forEach((e) => window.addEventListener(e, fire, { passive: true, once: true }));
      timer = window.setTimeout(fire, 3000);
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const handle = idle ? idle(arm) : window.setTimeout(arm, 800);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, fire));
      if (!idle) window.clearTimeout(handle as number);
    };
  }, []);

  // Pause rendering when the hero is off screen or the tab is hidden.
  useEffect(() => {
    const el = figure.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting && !document.hidden), {
      threshold: 0.05,
    });
    io.observe(el);
    const onVis = () => setActive(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const onFirstFrame = useCallback(() => setPhase("live"), []);
  const onAssembled = useCallback((ms: number) => {
    setAssembleMs(ms);
    setPhase("locked");
  }, []);

  const live = phase === "live" || phase === "locked";
  const box = data && phase === "locked" ? headBox(data) : null;

  return (
    <div ref={figure} className="relative">
      {/* The still: LCP element, fallback, and the thing the points assemble into. */}
      <div
        className="transition-opacity duration-500 ease-out"
        style={{ opacity: live ? 0 : 1 }}
        aria-hidden={live ? "true" : undefined}
      >
        {children}
      </div>

      {data && (
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{ opacity: live ? 1 : 0 }}
        >
          <PointCloudPortrait
            data={data}
            parallax={parallax}
            active={active}
            onFirstFrame={onFirstFrame}
            onAssembled={onAssembled}
          />
        </div>
      )}

      {/* Detection box: locks on after the assemble; telemetry is measured, not invented. */}
      {box && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute border-2 border-amber transition-opacity duration-300"
          style={{
            left: `${box.left * 100}%`,
            top: `${box.top * 100}%`,
            width: `${box.width * 100}%`,
            height: `${box.height * 100}%`,
          }}
        >
          <span className="absolute -top-6 left-0 whitespace-nowrap bg-amber px-1.5 py-0.5 font-mono text-[12px] leading-4 text-night">
            person · {data?.count.toLocaleString()} pts · {assembleMs} ms{fps ? ` · ${fps} fps` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
