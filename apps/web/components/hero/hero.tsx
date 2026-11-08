import { preload } from "react-dom";
import { ButtonLink } from "@/components/ui/button-link";
import { CV_PDF_URL } from "@/lib/cv";
import type { Resume } from "@/lib/resume";
import { isTodo } from "@/lib/resume";

/*
  W1 hero: text block (5 cols) + static still of the mono point cloud (7 cols).
  The still is rendered offline by tools/render_still.py from the same point
  data the live cloud (W5) will use, so the swap later is visual only.

  CTAs follow D21 once the features exist: primary becomes "Screen my CV
  against your role" (W3) and the secondary "Ask my AI twin" (W2). Until then
  the one amber action is the CV itself.

  Mobile-first (D17): the portrait comes first, then the text.
*/
export function Hero({ resume }: { resume: Resume }) {
  const { basics } = resume;
  const headline = isTodo(basics.headline) ? null : basics.headline;
  const email = isTodo(basics.email) ? null : basics.email;
  // The still is the LCP element; ask the browser for it before it parses the markup.
  preload("/portrait-still-1400.webp", {
    as: "image",
    fetchPriority: "high",
    imageSrcSet: "/portrait-still-800.webp 800w, /portrait-still-1400.webp 1400w",
    imageSizes: "(min-width: 768px) 58vw, 100vw",
  });

  return (
    <section className="mx-auto w-full max-w-site px-4 pb-20 pt-6 md:px-8 md:pb-28 md:pt-16">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:items-center md:gap-8">
        <figure className="relative md:order-2 md:col-span-7">
          {/* Static still (two sizes, already WebP). Plain <img> on purpose: no optimizer pass,
              no layout shift (explicit ratio), highest fetch priority since it is the LCP element. */}
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
          {/* Detector motif: amber corner brackets. Static here; in W5 the box locks on after
              the points assemble. No confidence value is shown because none is measured yet. */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-0">
            <span className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-amber" />
            <span className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-amber" />
            <span className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-amber" />
            <span className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-amber" />
          </span>
        </figure>

        <div className="md:order-1 md:col-span-5">
          <h1 className="font-display text-hero font-extrabold text-phosphor">{basics.name}</h1>
          <p className="mt-3 font-display text-h3 font-medium text-dim">{basics.role}.</p>
          {headline && <p className="mt-6 max-w-prose text-lead text-phosphor">{headline}</p>}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <ButtonLink href={CV_PDF_URL} variant="primary">
              Download CV
            </ButtonLink>
            {email && (
              <ButtonLink href={`mailto:${email}`} variant="text">
                Email me
              </ButtonLink>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
