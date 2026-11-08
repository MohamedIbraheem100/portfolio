"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { headBox, loadPoints, type PointData } from "@/lib/pcp3";

/*
  Progressive hero (W5).

  A tiny inline script in <head> (app/layout.tsx) decides before first paint:
  WebGL + no reduced-motion  ->  <html class="hero-live" data-hero-mode="desktop|touch">.
  CSS then hides the still from the very first frame, so a live device never
  sees a static image: the amber frame is there, and the portrait condenses out
  of dust inside it.

  - desktop: 40k points, loads immediately, cursor parallax.
  - touch:   20k points, no parallax, starts on the first touch/scroll or 2.2 s
             after load (keeps the work out of the mobile load metrics).
  - reduced motion / no WebGL: the still.

  After the assemble: one amber sweep, then the box locks onto the head with
  measured telemetry only (point count, assemble time, fps).
*/

const PointCloudPortrait = dynamic(() => import("@/three/PointCloudPortrait"), { ssr: false });

type Phase = "static" | "loading" | "live" | "scan" | "locked";
type Mode = "desktop" | "touch";

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
  const [mode, setMode] = useState<Mode>("desktop");
  const [data, setData] = useState<PointData | null>(null);
  const [active, setActive] = useState(true);
  const [assembleMs, setAssembleMs] = useState<number | null>(null);
  const fps = useFps(phase === "live" || phase === "scan" || phase === "locked");

  // Go live only where the head script said so.
  useEffect(() => {
    const html = document.documentElement;
    if (!html.classList.contains("hero-live")) return;
    const m: Mode = html.dataset.heroMode === "touch" ? "touch" : "desktop";
    const controller = new AbortController();
    let fired = false;
    let timer = 0;
    const gestures: Array<keyof WindowEventMap> = ["touchstart", "scroll", "pointerdown"];
    const start = () => {
      if (fired) return;
      fired = true;
      window.clearTimeout(timer);
      gestures.forEach((e) => window.removeEventListener(e, start));
      setMode(m);
      setPhase("loading");
      loadPoints(m === "touch" ? "/portrait-20k.pcp3" : "/portrait-40k.pcp3", controller.signal)
        .then(setData)
        .catch(() => {
          html.classList.remove("hero-live");
          setPhase("static");
        });
    };
    if (m === "desktop") {
      timer = window.setTimeout(start, 0);
    } else {
      const arm = () => {
        gestures.forEach((e) => window.addEventListener(e, start, { passive: true, once: true }));
        timer = window.setTimeout(start, 2200);
      };
      if (document.readyState === "complete") arm();
      else window.addEventListener("load", arm, { once: true });
    }
    return () => {
      window.clearTimeout(timer);
      gestures.forEach((e) => window.removeEventListener(e, start));
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
            parallax={mode === "desktop"}
            active={active}
            onFirstFrame={onFirstFrame}
            onAssembled={onAssembled}
          />
        </div>
      )}

      {/* Frame: the detector's corner brackets, from first paint until the box takes over. */}
      {phase !== "locked" && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-amber" />
          <span className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-amber" />
          <span className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-amber" />
          <span className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-amber" />
        </span>
      )}

      {/* Detector sweep: one pass over the portrait, then the box. */}
      {phase === "scan" && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="hero-scanline absolute left-0 right-0 h-px bg-amber shadow-[0_0_12px_2px_rgba(255,176,31,0.55)]" />
        </div>
      )}

      {/* Detection box: locks on after the sweep; telemetry is measured, not invented. */}
      {box && (
        <>
          <div
            aria-hidden="true"
            className="hero-box pointer-events-none absolute border-2 border-amber"
            style={{
              left: `${box.left * 100}%`,
              top: `${box.top * 100}%`,
              width: `${box.width * 100}%`,
              height: `${box.height * 100}%`,
            }}
          />
          {/* Label sits on the box's top-left but is clamped to the figure, so it never overflows
              on narrow screens (it truncates the fps first). */}
          <span
            aria-hidden="true"
            className="hero-box pointer-events-none absolute -translate-y-full truncate bg-amber px-1.5 py-0.5 font-mono text-[11px] leading-4 text-night md:text-[12px]"
            style={{
              left: `${box.left * 100}%`,
              top: `${box.top * 100}%`,
              maxWidth: `${(1 - box.left) * 100}%`,
            }}
          >
            person · {data?.count.toLocaleString()} pts
            {assembleMs !== null ? ` · ${(assembleMs / 1000).toFixed(2)} s` : ""}
            {fps ? ` · ${fps} fps` : ""}
          </span>
        </>
      )}
    </div>
  );
}
