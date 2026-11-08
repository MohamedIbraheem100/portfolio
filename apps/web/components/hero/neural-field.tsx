"use client";

import { useEffect, useRef } from "react";

/*
  Hero background (D28): a sparse field of nodes joined by faint threads, drifting
  slowly, with signal pulses travelling along the threads. Nodes near the cursor
  wake up (amber) and link to it. Canvas 2D, phosphor at very low alpha, so it
  reads as instrumentation behind the content, not as decoration in front of it.

  Guardrails: reduced motion -> one static frame; pauses when off screen or the
  tab is hidden; fewer nodes and no cursor on touch devices; DPR capped at 1.5.
*/

type Node = { x: number; y: number; vx: number; vy: number; r: number };
type Pulse = { a: number; b: number; t: number; speed: number };

const PHOSPHOR = "233, 236, 245";
const AMBER = "255, 176, 31";

export function NeuralField({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    let nodes: Node[] = [];
    let pulses: Pulse[] = [];
    let raf = 0;
    let active = true;
    let last = performance.now();
    const mouse = { x: -1e4, y: -1e4 };
    const LINK = 150;
    const MOUSE_R = 180;

    const seed = (n: number) => {
      nodes = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: 1 + Math.random() * 1.2,
      }));
      pulses = [];
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const density = coarse ? 11000 : 9000; // px^2 per node
      seed(Math.max(24, Math.min(110, Math.round((w * h) / density))));
      if (reduced) draw(0);
    };

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, w, h);
      // move
      for (const n of nodes) {
        n.x += n.vx * dt;
        n.y += n.vy * dt;
        if (n.x < -20) n.x = w + 20;
        if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20;
        if (n.y > h + 20) n.y = -20;
      }
      // threads
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > LINK * LINK) continue;
          const d = Math.sqrt(d2);
          const alpha = (1 - d / LINK) * 0.16;
          ctx.strokeStyle = `rgba(${PHOSPHOR}, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      // cursor: wake nearby nodes and link them to the cursor
      if (!coarse) {
        for (const n of nodes) {
          const dx = n.x - mouse.x;
          const dy = n.y - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d > MOUSE_R) continue;
          const k = 1 - d / MOUSE_R;
          ctx.strokeStyle = `rgba(${AMBER}, ${(k * 0.35).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
          ctx.fillStyle = `rgba(${AMBER}, ${(0.35 + k * 0.6).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + k * 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // nodes
      for (const n of nodes) {
        ctx.fillStyle = `rgba(${PHOSPHOR}, 0.35)`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      // pulses: a bright dot running along a thread, rarely
      if (!reduced) {
        if (pulses.length < 3 && Math.random() < 0.012 * dt) {
          const a = Math.floor(Math.random() * nodes.length);
          let best = -1;
          let bestD = LINK * LINK;
          for (let j = 0; j < nodes.length; j++) {
            if (j === a) continue;
            const dx = nodes[a].x - nodes[j].x;
            const dy = nodes[a].y - nodes[j].y;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestD) {
              bestD = d2;
              best = j;
            }
          }
          if (best >= 0) pulses.push({ a, b: best, t: 0, speed: 0.012 + Math.random() * 0.01 });
        }
        pulses = pulses.filter((p) => p.t <= 1);
        for (const p of pulses) {
          p.t += p.speed * dt;
          const a = nodes[p.a];
          const b = nodes[p.b];
          const x = a.x + (b.x - a.x) * p.t;
          const y = a.y + (b.y - a.y) * p.t;
          const fade = Math.sin(Math.PI * Math.min(1, p.t));
          ctx.fillStyle = `rgba(${PHOSPHOR}, ${(0.9 * fade).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x, y, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(2.5, (now - last) / 16.67); // in 60 fps frames
      last = now;
      if (active) draw(dt);
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const onLeave = () => {
      mouse.x = -1e4;
      mouse.y = -1e4;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      active = e.isIntersecting && !document.hidden;
    });
    io.observe(canvas);
    const onVis = () => {
      active = !document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);
    if (!coarse) {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("blur", onLeave);
    }
    if (!reduced) raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", onLeave);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none ${className}`} />;
}
