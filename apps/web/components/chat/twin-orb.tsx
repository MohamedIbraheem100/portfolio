"use client";

import { useEffect, useRef } from "react";

/*
  The AI twin's mark: a small sphere of points turning in 3D, the site's point-cloud
  language at the size of an icon. It stands in for a face (the portrait appears once,
  in the hero). While the twin is thinking the sphere turns faster and its points
  warm to amber, so it is also the waiting indicator.

  Canvas 2D, about 90 points: cheap enough to sit on every page. It stops when the
  tab is hidden, and draws one still frame under reduced motion.
*/

const POINTS = 90;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
// A Fibonacci sphere: evenly spread unit vectors, computed once.
const SPHERE = Array.from({ length: POINTS }, (_, i) => {
  const y = 1 - (i / (POINTS - 1)) * 2;
  const r = Math.sqrt(1 - y * y);
  return { x: Math.cos(GOLDEN * i) * r, y, z: Math.sin(GOLDEN * i) * r };
});

export function TwinOrb({ size, active = false }: { size: number; active?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.width = size * dpr;
    el.height = size * dpr;
    ctx.scale(dpr, dpr);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const radius = size * 0.4;
    let angle = 0.6;
    let warmth = 0; // 0 = phosphor, 1 = amber; eased so the change is not a jump
    let frame = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(now - last, 50) / 1000;
      last = now;
      const busy = activeRef.current;
      angle += dt * (busy ? 2.6 : 0.55);
      warmth += ((busy ? 1 : 0) - warmth) * Math.min(dt * 6, 1);
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);
      ctx.clearRect(0, 0, size, size);
      for (const p of SPHERE) {
        // turn around the vertical axis, with a fixed tilt so the poles are visible
        const x = p.x * cos + p.z * sin;
        const z0 = p.z * cos - p.x * sin;
        const y = p.y * 0.94 - z0 * 0.34;
        const z = z0 * 0.94 + p.y * 0.34;
        const depth = (z + 1) / 2; // 0 back, 1 front
        const scale = 0.82 + depth * 0.3;
        const r = Math.round(233 + (255 - 233) * warmth);
        const g = Math.round(236 + (176 - 236) * warmth);
        const b = Math.round(245 + (31 - 245) * warmth);
        ctx.fillStyle = `rgba(${r},${g},${b},${0.18 + depth * 0.82})`;
        ctx.beginPath();
        ctx.arc(size / 2 + x * radius * scale, size / 2 + y * radius * scale, (0.5 + depth * 0.9) * (size / 44), 0, 7);
        ctx.fill();
      }
      if (!still) frame = requestAnimationFrame(draw);
    };

    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !still) {
        last = performance.now();
        frame = requestAnimationFrame(draw);
      }
    };
    frame = requestAnimationFrame(draw);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [size]);

  return <canvas ref={canvas} aria-hidden="true" style={{ width: size, height: size }} className="block shrink-0" />;
}
