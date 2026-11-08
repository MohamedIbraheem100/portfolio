import { ButtonLink } from "@/components/ui/button-link";
import { DetectOnView } from "@/components/work/detect-on-view";
import { isTodo, type Project, type Resume } from "@/lib/resume";

/*
  Selected work: one full-width scene per project, not a card grid (CLAUDE.md).
  The demo or video is the visual (W4 live demos, W6 videos). Until a project
  has its visual, its scene is text only: no empty frames, no placeholders.
  Every number is a sentence inside its project (D15). TODO values are hidden.
*/

const show = (v: string | undefined | null): v is string => Boolean(v) && !isTodo(v);

type Visual = { src: string; width: number; height: number; alt: string; href?: string };

/* Visuals that exist today. Keyed by project slug; a project without an entry renders text only. */
const VISUALS: Record<string, Visual> = {
  mizan: {
    src: "/work/mizan-home.webp",
    width: 1440,
    height: 900,
    alt: "Mizan's home page: 'Every score, backed by a line from the CV', with a 3D balance scale.",
    href: "https://mizan-hr.vercel.app",
  },
};

function Scene({ project, index }: { project: Project; index: number }) {
  const visual = VISUALS[project.slug];
  const results = project.results.filter(show);
  const stack = project.stack.filter(show);
  const live = show(project.links.live) ? project.links.live : undefined;
  const repo = show(project.links.repo) ? project.links.repo : undefined;
  const flip = index % 2 === 1;

  return (
    <article
      id={project.slug}
      className="grid grid-cols-1 gap-8 border-t border-phosphor/10 py-14 md:grid-cols-12 md:gap-8 md:py-20"
    >
      <div className={`md:col-span-5 ${flip ? "md:order-2" : ""}`}>
        <h3 className="font-display text-h2 font-extrabold text-phosphor">{project.name}</h3>
        {show(project.one_liner) && <p className="mt-4 max-w-prose text-lead">{project.one_liner}</p>}
        {results.length > 0 && (
          <ul className="mt-6 max-w-prose space-y-3 text-body text-phosphor">
            {results.map((r) => (
              <li key={r} className="border-l-2 border-amber/70 pl-4">
                {r}
              </li>
            ))}
          </ul>
        )}
        {show(project.role) && <p className="mt-6 max-w-prose text-small text-dim">{project.role}</p>}
        {stack.length > 0 && <p className="mt-2 text-small text-dim">{stack.join(" · ")}</p>}
        {(live || repo) && (
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            {live && (
              <ButtonLink href={live} variant="quiet" target="_blank" rel="noopener">
                Open {project.name}
              </ButtonLink>
            )}
            {repo && (
              <ButtonLink href={repo} variant="text" target="_blank" rel="noopener">
                Source on GitHub
              </ButtonLink>
            )}
          </div>
        )}
      </div>

      {visual && (
        <figure className={`md:col-span-7 ${flip ? "md:order-1" : ""}`}>
          <DetectOnView label={`${project.slug} · ${project.demo === "live" ? "live demo" : project.demo}`}>
          <a
            href={visual.href ?? live ?? "#"}
            target="_blank"
            rel="noopener"
            className="block rounded-box bg-night-raised p-2 ring-1 ring-phosphor/10 transition-colors hover:ring-amber/70"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={visual.src}
              width={visual.width}
              height={visual.height}
              alt={visual.alt}
              loading="lazy"
              decoding="async"
              className="block h-auto w-full rounded-box"
            />
          </a>
          </DetectOnView>
        </figure>
      )}
    </article>
  );
}

export function SelectedWork({ resume }: { resume: Resume }) {
  const projects = resume.projects.filter((p) => show(p.one_liner));
  if (projects.length === 0) return null;
  return (
    <section id="work" aria-labelledby="work-heading" className="mx-auto w-full max-w-site px-4 md:px-8">
      <h2 id="work-heading" className="font-display text-h3 font-medium text-dim">
        Selected work
      </h2>
      <div className="mt-6">
        {projects.map((p, i) => (
          <Scene key={p.slug} project={p} index={i} />
        ))}
      </div>
    </section>
  );
}
