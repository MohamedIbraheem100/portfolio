"use client";

import { useEffect, useRef } from "react";

/*
  Site background (D28, extended to the whole page): a fixed layer behind all
  content with sparse nodes joined by faint phosphor threads, slow drift, rare
  signal pulses along threads, nodes near the cursor waking up amber and linking
  to it. The field scrolls at a fraction of the page speed (a deeper layer) and
  thins out below the hero so long text stays comfortable to read.

  Guardrails: reduced motion -> one static frame; pauses in hidden tabs; fewer
  nodes and no cursor on touch devices; DPR capped at 1.5; one canvas for the
  whole site.
*/

type Node = { x: number; y: number; vx: number; vy: number; r: number };
type Pulse = { a: number; b: number; t: number; speed: number };

const PHOSPHOR = "233, 236, 245";
const AMBER = "255, 176, 31";
const LINK = 150;
const MOUSE_R = 180;
const PARALLAX = 0.12; // field moves at 12% of the page scroll

export function SiteField() {
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
    let active = !document.hidden;
    let last = performance.now();
    const mouse = { x: -1e4, y: -1e4 };

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
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const density = coarse ? 12000 : 9500; // px^2 per node
      seed(Math.max(24, Math.min(120, Math.round((w * h) / density))));
      if (reduced) draw(0);
    };

    // Below the hero the threads fade to ~45%: reading comfort over spectacle.
    const depthFactor = () => {
      const hero = h * 0.9;
      const y = window.scrollY;
      return y < hero ? 1 : Math.max(0.45, 1 - (y - hero) / (h * 1.2));
    };

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, w, h);
      const shift = (window.scrollY * PARALLAX) % h; // wrap so the field never runs out
      const k = depthFactor();
      for (const n of nodes) {
        n.x += n.vx * dt;
        n.y += n.vy * dt;
        if (n.x < -20) n.x = w + 20;
        if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20;
        if (n.y > h + 20) n.y = -20;
      }
      // screen positions after the scroll parallax
      const sy = (y: number) => {
        let v = y - shift;
        if (v < -20) v += h + 40;
        return v;
      };
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        const ay = sy(a.y);
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const by = sy(b.y);
          const dx = a.x - b.x;
          const dy = ay - by;
          const d2 = dx * dx + dy * dy;
          if (d2 > LINK * LINK) continue;
          const d = Math.sqrt(d2);
          const alpha = (1 - d / LINK) * 0.16 * k;
          ctx.strokeStyle = `rgba(${PHOSPHOR}, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, ay);
          ctx.lineTo(b.x, by);
          ctx.stroke();
        }
      }
      if (!coarse) {
        for (const n of nodes) {
          const ny = sy(n.y);
          const dx = n.x - mouse.x;
          const dy = ny - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d > MOUSE_R) continue;
          const m = 1 - d / MOUSE_R;
          ctx.strokeStyle = `rgba(${AMBER}, ${(m * 0.35).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(n.x, ny);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
          ctx.fillStyle = `rgba(${AMBER}, ${(0.35 + m * 0.6).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(n.x, ny, n.r + m * 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillStyle = `rgba(${PHOSPHOR}, ${(0.35 * k).toFixed(3)})`;
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, sy(n.y), n.r, 0, Math.PI * 2);
        ctx.fill();
      }
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
          const y = sy(a.y) + (sy(b.y) - sy(a.y)) * p.t;
          const fade = Math.sin(Math.PI * Math.min(1, p.t));
          ctx.fillStyle = `rgba(${PHOSPHOR}, ${(0.9 * fade * k).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x, y, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(2.5, (now - last) / 16.67);
      last = now;
      if (active) draw(dt);
      raf = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const onLeave = () => {
      mouse.x = -1e4;
      mouse.y = -1e4;
    };
    const onVis = () => {
      active = !document.hidden;
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);
    if (!coarse) {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("blur", onLeave);
    }
    if (!reduced) raf = requestAnimationFrame(loop);
    else window.addEventListener("scroll", () => draw(0), { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full print:hidden"
    />
  );
}
