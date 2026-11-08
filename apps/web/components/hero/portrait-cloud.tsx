"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { headBox, loadPoints, type PointData } from "@/lib/pcp3";

/*
  Progressive hero (W5).

  A tiny inline script in <head> (app/layout.tsx) decides before first paint:
  fine pointer + WebGL + no reduced-motion  ->  <html class="hero-live">.
  CSS then hides the still from the very first frame, so a capable desktop
  never sees a static image: the name is there and the portrait condenses out
  of dust as soon as the point data and three.js arrive (both start loading
  immediately; the script also preloads the point file).

  Everyone else (phones, reduced motion, no WebGL) gets the still, which is
  also the LCP element Lighthouse measures on mobile.

  After the assemble: one amber sweep, then the box locks onto the head with
  measured telemetry only (point count, assemble time, fps).
*/

const PointCloudPortrait = dynamic(() => import("@/three/PointCloudPortrait"), { ssr: false });

type Phase = "static" | "loading" | "live" | "scan" | "locked";

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
  const [active, setActive] = useState(true);
  const [assembleMs, setAssembleMs] = useState<number | null>(null);
  const fps = useFps(phase === "live" || phase === "scan" || phase === "locked");

  // Go live only where the head script said so; load the points at once.
  useEffect(() => {
    if (!document.documentElement.classList.contains("hero-live")) return;
    const controller = new AbortController();
    const start = () => {
      setPhase("loading");
      loadPoints("/portrait-40k.pcp3", controller.signal)
        .then(setData)
        .catch(() => {
          document.documentElement.classList.remove("hero-live");
          setPhase("static");
        });
    };
    const id = window.setTimeout(start, 0);
    return () => {
      window.clearTimeout(id);
      controller.abort();
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
    setPhase("scan");
  }, []);
  // The scan line sweeps once (CSS animation, 550 ms); when it ends the box locks on.
  useEffect(() => {
    if (phase !== "scan") return;
    const t = window.setTimeout(() => setPhase("locked"), 600);
    return () => window.clearTimeout(t);
  }, [phase]);

  const box = data && phase === "locked" ? headBox(data) : null;

  return (
    <div ref={figure} className="relative">
      {/* The still: hidden from first paint under html.hero-live (globals.css), otherwise the hero. */}
      <div className="hero-still">{children}</div>

      {data && (
        <div className="absolute inset-0">
          <PointCloudPortrait
            data={data}
            parallax
            active={active}
            onFirstFrame={onFirstFrame}
            onAssembled={onAssembled}
          />
        </div>
      )}

      {/* Detector sweep: one pass over the portrait, then the box. */}
      {phase === "scan" && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="hero-scanline absolute left-0 right-0 h-px bg-amber shadow-[0_0_12px_2px_rgba(255,176,31,0.55)]" />
        </div>
      )}

      {/* Detection box: locks on after the sweep; telemetry is measured, not invented. */}
      {box && (
        <div
          aria-hidden="true"
          className="hero-box pointer-events-none absolute border-2 border-amber"
          style={{
            left: `${box.left * 100}%`,
            top: `${box.top * 100}%`,
            width: `${box.width * 100}%`,
            height: `${box.height * 100}%`,
          }}
        >
          <span className="absolute -top-6 left-0 whitespace-nowrap bg-amber px-1.5 py-0.5 font-mono text-[12px] leading-4 text-night">
            person · {data?.count.toLocaleString()} pts
            {assembleMs !== null ? ` · ${(assembleMs / 1000).toFixed(2)} s` : ""}
            {fps ? ` · ${fps} fps` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
