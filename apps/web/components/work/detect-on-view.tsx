"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/*
  Scroll as a detector: when a project's visual enters the viewport, amber corner
  brackets draw around it once and a small label names what was found (real
  facts only: the project slug and the kind of demo). Same language as the hero,
  instead of a generic fade-up. Fires once per visit; nothing under reduced motion.
*/
export function DetectOnView({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative">
      {children}
      {seen && (
        <span aria-hidden="true" className="detect pointer-events-none absolute -inset-2">
          <span className="detect-corner absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-amber" />
          <span className="detect-corner absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-amber" />
          <span className="detect-corner absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-amber" />
          <span className="detect-corner absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-amber" />
          <span className="detect-label absolute -top-6 left-0 whitespace-nowrap bg-amber px-1.5 py-0.5 font-mono text-[11px] leading-4 text-night">
            {label}
          </span>
        </span>
      )}
    </div>
  );
}
