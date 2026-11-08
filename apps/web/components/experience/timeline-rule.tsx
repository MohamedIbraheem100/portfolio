"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";

/*
  The Experience timeline's vertical rule fills with amber as the visitor scrolls
  through the section (GSAP ScrollTrigger, scrubbed to the scroll position). The
  rule is the only scroll-driven element on the page besides the detect boxes;
  under reduced motion it is simply drawn full.
*/
export function TimelineRule({ targetId }: { targetId: string }) {
  const fill = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = fill.current;
    const section = document.getElementById(targetId);
    if (!el || !section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.transform = "scaleY(1)";
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    const tween = gsap.fromTo(
      el,
      { scaleY: 0 },
      {
        scaleY: 1,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top 70%", end: "bottom 60%", scrub: 0.4 },
      },
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [targetId]);

  return (
    <span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 top-0 hidden w-px md:block">
      <span className="absolute inset-0 bg-phosphor/10" />
      <span ref={fill} className="absolute inset-0 origin-top bg-amber" style={{ transform: "scaleY(0)" }} />
    </span>
  );
}
