import { preload } from "react-dom";
import { ButtonLink } from "@/components/ui/button-link";
import { TrackLink } from "@/components/ui/track-link";
import { PortraitCloud } from "@/components/hero/portrait-cloud";
import { CV_PDF_URL } from "@/lib/cv";
import type { Resume } from "@/lib/resume";
import { isTodo } from "@/lib/resume";

/*
  Hero: text block (5 cols) + the portrait (7 cols). The static still (rendered
  offline by tools/render_still.py) is the LCP element and the fallback; after
  the page is idle, PortraitCloud replaces it with the live point cloud built
  from the same data (W5), when the device and the visitor's settings allow.

  CTAs (D21): the one amber action is Recruiter Mode (/fit, W3). The secondary
  is the CV until the AI twin ships (W2), when it becomes "Ask my AI twin".

  Mobile: text first, then the portrait (the cloud starts a moment later there, below the name).
*/
export function Hero({ resume }: { resume: Resume }) {
  const { basics } = resume;
  const headline = isTodo(basics.headline) ? null : basics.headline;
  // The still is the LCP element; ask the browser for it before it parses the markup.
  preload("/portrait-still-1400.webp", {
    as: "image",
    fetchPriority: "high",
    imageSrcSet: "/portrait-still-800.webp 800w, /portrait-still-1400.webp 1400w",
    imageSizes: "(min-width: 768px) 58vw, 100vw",
  });

  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-site px-4 pb-20 pt-6 md:px-8 md:pb-28 md:pt-16">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:items-center md:gap-8">
          <div className="md:col-span-5">
            <h1 className="font-display text-hero font-extrabold text-phosphor">{basics.name}</h1>
            <p className="mt-3 font-display text-h3 font-medium text-dim">{basics.role}.</p>
            {headline && <p className="mt-6 max-w-prose text-lead text-phosphor">{headline}</p>}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <ButtonLink href="/fit" variant="primary">
                Screen my CV against your role
              </ButtonLink>
              <TrackLink event="download_cv" href={CV_PDF_URL} variant="text">
                Download CV
              </TrackLink>
            </div>
          </div>

          <figure className="relative isolate md:col-span-7">
            {/* Soft lift behind the portrait so the cloud sits in a pool of light, not on flat night. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-[12%] -z-10 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(22,29,69,0.95)_0%,rgba(22,29,69,0.55)_40%,rgba(13,19,48,0)_70%)]"
            />
            <PortraitCloud>
              {/* Static still (two sizes, already WebP). Plain <img> on purpose: no optimizer pass,
                  no layout shift (explicit ratio), highest fetch priority since it is the LCP element
                  wherever the cloud does not run. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/portrait-still-1400.webp"
                srcSet="/portrait-still-800.webp 800w, /portrait-still-1400.webp 1400w"
                sizes="(min-width: 768px) 58vw, 100vw"
                width={1400}
                height={862}
                alt={`${basics.name} as a point cloud: head and shoulders rendered from 40,000 depth-mapped points.`}
                fetchPriority="high"
                decoding="async"
                className="block h-auto w-full"
              />
            </PortraitCloud>
          </figure>
        </div>
      </div>
    </section>
  );
}
