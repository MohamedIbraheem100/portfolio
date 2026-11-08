import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = {
  title: "Specimen",
  robots: { index: false, follow: false },
};

const colors = [
  { name: "night", hex: "#0D1330", cls: "bg-night", use: "Page background. Never neutral black." },
  { name: "night-raised", hex: "#161D45", cls: "bg-night-raised", use: "Raised surfaces: chat panel, demo frames." },
  { name: "phosphor", hex: "#E9ECF5", cls: "bg-phosphor", use: "Primary text." },
  { name: "dim", hex: "#8B92AB", cls: "bg-dim", use: "Secondary text." },
  { name: "amber", hex: "#FFB01F", cls: "bg-amber", use: "Bounding boxes, focus rings, the primary CTA. The only action color." },
];

const inferno = ["bg-inferno-0", "bg-inferno-1", "bg-inferno-2", "bg-inferno-3", "bg-inferno-4"];

const scale = [
  { token: "hero", cls: "text-hero font-display font-extrabold", note: "44 to 120px, fluid. Hero name only." },
  { token: "h1", cls: "text-h1 font-display font-extrabold", note: "72px" },
  { token: "h2", cls: "text-h2 font-display font-extrabold", note: "44px" },
  { token: "h3", cls: "text-h3 font-display font-medium", note: "28px" },
  { token: "lead", cls: "text-lead font-body", note: "21px" },
  { token: "body", cls: "text-body font-body", note: "17px, line-height 1.6" },
  { token: "small", cls: "text-small font-body", note: "14px" },
];

/*
  Internal page: the owner judges the font pair and the tokens by eye here
  before any real content is written (D2). Not indexed, not in the sitemap.
*/
export default function Specimen() {
  return (
    <div className="mx-auto w-full max-w-site px-4 py-16 md:px-8">
      <h1 className="font-display text-h2 font-extrabold">Specimen</h1>
      <p className="mt-3 max-w-prose text-dim">
        Every token in one place. If something is not on this page, it is not part of the system.
      </p>

      <section className="mt-16">
        <h2 className="font-display text-h3 font-medium">Colors</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {colors.map((c) => (
            <li key={c.name} className="flex gap-4">
              <span className={`h-16 w-16 shrink-0 rounded-box border border-phosphor/15 ${c.cls}`} />
              <div>
                <p className="font-display font-medium">
                  {c.name} <span className="text-dim">{c.hex}</span>
                </p>
                <p className="text-small text-dim">{c.use}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <p className="font-display font-medium">
            inferno <span className="text-dim">model output only: point cloud, heatmaps, detections</span>
          </p>
          <div className="mt-3 flex h-10 w-full max-w-xl overflow-hidden rounded-box">
            {inferno.map((cls) => (
              <span key={cls} className={`flex-1 ${cls}`} />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-h3 font-medium">Type scale</h2>
        <ul className="mt-6 flex flex-col gap-8">
          {scale.map((s) => (
            <li key={s.token}>
              <p className="text-small text-dim">
                {s.token} <span aria-hidden="true">·</span> {s.note}
              </p>
              <p className={`mt-1 ${s.cls}`}>Field of View</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-h3 font-medium">Body text at 70ch</h2>
        <div className="mt-6 max-w-prose">
          <p>
            The site is seen through a vision model&rsquo;s eyes. Its visual language comes from the
            work itself: point clouds, depth maps, the inferno colormap, bounding boxes and real
            telemetry. Everything else on the page is quiet, so the one orchestrated moment on load
            and the live demos carry the attention.
          </p>
          <p className="mt-5">
            <em>Italic is Newsreader as well,</em> used for emphasis inside a sentence and for the
            occasional aside, never for whole paragraphs.
          </p>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-h3 font-medium">Telemetry (specimen values)</h2>
        <p className="mt-3 max-w-prose text-dim">
          JetBrains Mono is reserved for numbers a model actually produced. On this page they are
          type samples, not measurements.
        </p>
        <p className="mt-4 font-mono text-small text-phosphor">
          person 0.99 <span className="text-dim">|</span> 14.2 ms <span className="text-dim">|</span>{" "}
          58 fps <span className="text-dim">|</span> webgpu
        </p>
      </section>

      <section className="mt-16">
        <h2 className="font-display text-h3 font-medium">Arabic (chat replies)</h2>
        <p lang="ar" dir="rtl" className="mt-4 max-w-prose text-lead">
          هذه عينة من خط IBM Plex Sans Arabic كما سيظهر في ردود النسخة الذكية عندما يكتب الزائر
          بالعربية.
        </p>
      </section>

      <section className="mt-16 pb-16">
        <h2 className="font-display text-h3 font-medium">Actions</h2>
        <p className="mt-3 max-w-prose text-dim">
          One amber action per view. Tab through them to see the focus ring.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-6">
          <ButtonLink href="/specimen#top" variant="primary">
            Screen my CV against your role
          </ButtonLink>
          <ButtonLink href="/specimen#top" variant="quiet">
            CV
          </ButtonLink>
          <ButtonLink href="/specimen#top" variant="text">
            Ask my AI twin
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
