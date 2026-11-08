"use client";

import { useEffect } from "react";

/*
  Lenis smooth scroll with the D8 guardrails:
  - off under prefers-reduced-motion (motion rule 5);
  - off on touch devices (pointer: coarse): native scrolling there;
  - lerp 0.1, no "ice rink";
  - anchor links handled by Lenis (anchors: true), find-in-page and keyboard
    scrolling stay native because Lenis never touches them;
  - loaded after first paint via dynamic import, so it is not in the LCP path.
*/
export function SmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || coarse) return;

    let raf = 0;
    let lenis: { raf: (t: number) => void; destroy: () => void } | null = null;
    let cancelled = false;

    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({ lerp: 0.1, anchors: true, autoRaf: false });
      const loop = (time: number) => {
        lenis?.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      lenis?.destroy();
    };
  }, []);

  return null;
}
