import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { ButtonLink } from "@/components/ui/button-link";
import { isTodo, loadResume, pendingContent, type Experience, type Project } from "@/lib/resume";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "CV",
  description: `CV of ${site.name}, ${site.role}.`,
};

/* Built in CI from this page (D14) and published as a rolling release asset. */
export const CV_PDF_URL =
  "https://github.com/MohamedIbraheem100/portfolio/releases/download/cv-latest/Mohamed-Ibrahim-CV.pdf";

const show = (v: string | null | undefined): v is string => Boolean(v) && !isTodo(v);
const period = (start: string, end: string | null) =>
  `${show(start) ? start : ""}${show(start) || show(end) || end === null ? " to " : ""}${
    end === null ? "present" : show(end) ? end : ""
  }`.trim();

function ExperienceItem({ job }: { job: Experience }) {
  const impact = job.impact.filter(show);
  return (
    <li className="grid gap-2 md:grid-cols-[10rem_1fr] md:gap-8">
      <p className="text-small text-dim">{period(job.start, job.end)}</p>
      <div>
        <h3 className="font-display text-lead font-medium">
          {show(job.title) ? `${job.title}, ` : ""}
          {job.company}
        </h3>
        {show(job.location) && <p className="text-small text-dim">{job.location}</p>}
        {impact.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {impact.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

function ProjectItem({ project }: { project: Project }) {
  const results = project.results.filter(show);
  return (
    <li>
      <h3 className="font-display text-lead font-medium">
        {project.name}
        {project.links.live && show(project.links.live) && (
          <>
            {" "}
            <a
              href={project.links.live}
              className="text-small font-body text-dim underline underline-offset-4 hover:text-amber print:no-underline"
            >
              {project.links.live.replace(/^https?:\/\//, "")}
            </a>
          </>
        )}
      </h3>
      {show(project.one_liner) && <p className="mt-1">{project.one_liner}</p>}
      {results.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {results.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-small text-dim">{project.stack.filter(show).join(", ")}</p>
    </li>
  );
}

/*
  The CV is read from resume.yaml at build time and cached. Fields the owner has
  not filled yet (TODO markers) are hidden from visitors; in development the list
  of pending paths is shown at the bottom so nothing is forgotten.
*/
export default async function CvPage() {
  "use cache";
  cacheLife("days");
  const resume = loadResume();
  const { basics } = resume;
  const pending = process.env.NODE_ENV === "production" ? [] : pendingContent(resume);
  const skills = resume.skills.filter((g) => g.items.some(show));
  const education = resume.education.filter((e) => show(e.institution));
  const languages = resume.languages.filter((l) => show(l.level));

  return (
    <article className="mx-auto w-full max-w-site px-4 py-12 md:px-8 md:py-16 print:p-0">
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-h2 font-extrabold md:text-h1">{basics.name}</h1>
          <p className="mt-2 font-display text-h3 font-medium text-dim">{basics.role}</p>
          {show(basics.headline) && <p className="mt-4 max-w-prose text-lead">{basics.headline}</p>}
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-small text-dim">
            {show(basics.location) && <span>{basics.location}</span>}
            {show(basics.email) && <a href={`mailto:${basics.email}`}>{basics.email}</a>}
            {show(basics.links.github) && (
              <a href={basics.links.github}>{basics.links.github.replace(/^https?:\/\//, "")}</a>
            )}
            {show(basics.links.linkedin) && (
              <a href={basics.links.linkedin}>{basics.links.linkedin.replace(/^https?:\/\//, "")}</a>
            )}
            {show(basics.links.site) && (
              <a href={basics.links.site}>{basics.links.site.replace(/^https?:\/\//, "")}</a>
            )}
          </p>
        </div>
        <div className="flex gap-4 print:hidden">
          <ButtonLink href={CV_PDF_URL} variant="primary">
            Download PDF
          </ButtonLink>
        </div>
      </header>

      <section className="mt-14">
        <h2 className="font-display text-h3 font-medium">Experience</h2>
        <ul className="mt-6 space-y-8">
          {resume.experience.map((job) => (
            <ExperienceItem key={`${job.company}-${job.start}`} job={job} />
          ))}
        </ul>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-h3 font-medium">Selected projects</h2>
        <ul className="mt-6 space-y-8">
          {resume.projects.map((p) => (
            <ProjectItem key={p.slug} project={p} />
          ))}
        </ul>
      </section>

      {skills.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-h3 font-medium">Skills</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-[10rem_1fr] md:gap-x-8">
            {skills.map((g) => (
              <li key={g.group} className="contents">
                <p className="text-small text-dim">{g.group}</p>
                <p>{g.items.filter(show).join(", ")}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {education.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-h3 font-medium">Education</h2>
          <ul className="mt-6 space-y-4">
            {education.map((e) => (
              <li key={e.institution} className="grid gap-2 md:grid-cols-[10rem_1fr] md:gap-8">
                <p className="text-small text-dim">{period(e.start, e.end)}</p>
                <p>
                  {show(e.degree) ? `${e.degree}, ` : ""}
                  {e.institution}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {languages.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-h3 font-medium">Languages</h2>
          <p className="mt-4">{languages.map((l) => `${l.language} (${l.level})`).join(", ")}</p>
        </section>
      )}

      {pending.length > 0 && (
        <aside className="mt-16 rounded-box border border-amber/40 p-4 text-small text-dim print:hidden">
          <p className="font-display font-medium text-amber">
            Development only: {pending.length} content fields still pending in resume.yaml
          </p>
          <ul className="mt-2 columns-2 font-mono">
            {pending.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  );
}
