"use client";

import { useEffect, useRef } from "react";

/*
  A project's video inside its scene (CLAUDE.md, Media projects). Muted, looping,
  and it only plays while it is on screen: nothing is downloaded until the scene is
  near the viewport (preload="none"), and it pauses when scrolled away. Under
  reduced motion it never starts by itself; the controls are always there.
*/
export function SceneVideo({
  src,
  poster,
  width,
  height,
  label,
}: {
  src: string;
  poster: string;
  width: number;
  height: number;
  label: string;
}) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = video.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void el.play().catch(() => {
            /* autoplay refused (data saver, policy): the poster and the controls remain */
          });
        } else {
          el.pause();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={video}
      muted
      loop
      playsInline
      controls
      preload="none"
      poster={poster}
      width={width}
      height={height}
      aria-label={label}
      className="block h-auto w-full rounded-box bg-night"
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
