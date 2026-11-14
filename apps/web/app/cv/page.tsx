import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { isTodo, loadResume, pendingContent, type Experience, type Project } from "@/lib/resume";
import { site } from "@/lib/site";
import { CV_PDF_URL } from "@/lib/cv";

export const metadata: Metadata = {
  title: "CV",
  description: `CV of ${site.name}, ${site.role}.`,
};

/*
  One document, two media. On screen it is a page of the site; printed (CI prints
  it to the PDF visitors download, D14) it is a plain one-column CV that an ATS can
  parse: real text in reading order, standard section names, no tables, icons or
  columns, black on white, two A4 pages. Sizes in pt apply to print only.
*/

const show = (v: string | null | undefined): v is string => Boolean(v) && !isTodo(v);
const bare = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function when(value: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : value;
}
function period(start: string, end: string | null): string {
  const from = show(start) ? when(start) : "";
  const to = end === null ? "Present" : show(end) ? when(end) : "";
  return from && to ? `${from} – ${to}` : from || to;
}

const BULLETS = "mt-2 list-disc space-y-1 pl-5 print:mt-[2pt] print:space-y-0 print:pl-[13pt]";
const ENTRY_TITLE = "font-display text-lead font-medium print:text-[11pt] print:leading-[1.3]";
const META = "text-small text-dim print:text-[10pt]";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12 print:mt-[11pt]">
      <h2 className="border-b border-phosphor/15 pb-2 font-display text-h3 font-medium print:break-after-avoid print:border-[#000] print:pb-[1.5pt] print:text-[11pt] print:font-extrabold print:uppercase print:leading-[1.3] print:tracking-[0.06em]">
        {title}
      </h2>
      <div className="mt-6 print:mt-[5pt]">{children}</div>
    </section>
  );
}

const LINK = "underline decoration-dim/50 underline-offset-4 hover:text-amber print:no-underline";

/* Title on the left, dates (or a note, or a link) on the right; in the PDF text the title comes first. */
function EntryHead({ title, right, link }: { title: ReactNode; right?: string; link?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 print:flex-nowrap">
      <h3 className={`${ENTRY_TITLE} print:min-w-0 print:flex-1`}>{title}</h3>
      {right && <p className={`${META} shrink-0`}>{right}</p>}
      {link && (
        <a href={link} className={`${META} ${LINK} shrink-0`}>
          {bare(link)}
        </a>
      )}
    </div>
  );
}

function ExperienceItem({ job }: { job: Experience }) {
  const impact = job.impact.filter(show);
  // Role and dates on the first line, employer and place on the second.
  const employer = [show(job.title) ? job.company : "", show(job.location) ? job.location : ""]
    .filter(Boolean)
    .join(", ");
  return (
    <li className="print:break-inside-avoid">
      <EntryHead title={show(job.title) ? job.title : job.company} right={period(job.start, job.end)} />
      {employer && <p className={META}>{employer}</p>}
      {impact.length > 0 && (
        <ul className={BULLETS}>
          {impact.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </li>
  );
}

function ProjectItem({ project }: { project: Project }) {
  const results = project.results.filter(show);
  const stack = project.stack.filter(show);
  const role = show(project.role) ? project.role : undefined;
  const live = show(project.links.live) ? project.links.live : undefined;
  return (
    <li className="print:break-inside-avoid">
      {/* The right side holds the role; a project without one shows its live address there. */}
      <EntryHead title={project.name} right={role} link={role ? undefined : live} />
      <p className="mt-1 print:mt-0">
        {project.one_liner}
        {role && live && (
          <>
            {" "}
            <a href={live} className={`${LINK} whitespace-nowrap`}>
              {bare(live)}
            </a>
          </>
        )}
      </p>
      {results.length > 0 && (
        <ul className={BULLETS}>
          {results.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {stack.length > 0 && <p className={`${META} mt-2 print:mt-[1pt]`}>Stack: {stack.join(", ")}</p>}
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
  // Work done for an employer is told once, under Experience; a project needs its one-liner.
  const projects = resume.projects.filter((p) => p.demo !== "case-study" && show(p.one_liner));
  const skills = resume.skills.filter((g) => g.items.some(show));
  const education = resume.education.filter((e) => show(e.institution));
  const languages = resume.languages.filter((l) => show(l.level));
  const certificates = resume.certificates.filter((c) => show(c.name));
  const contact: { label: string; href?: string }[] = [
    ...(show(basics.email) ? [{ label: basics.email, href: `mailto:${basics.email}` }] : []),
    ...(show(basics.location) ? [{ label: basics.location }] : []),
    ...(show(basics.links.linkedin) ? [{ label: bare(basics.links.linkedin), href: basics.links.linkedin }] : []),
    ...(show(basics.links.github) ? [{ label: bare(basics.links.github), href: basics.links.github }] : []),
    ...(show(basics.links.site) ? [{ label: bare(basics.links.site), href: basics.links.site }] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-site px-4 py-12 md:px-8 md:py-16 print:max-w-none print:p-0">
      <article className="max-w-[54rem] print:max-w-none print:text-[10.5pt] print:leading-[1.38]">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between print:block print:text-center">
          <div>
            <h1 className="font-display text-h2 font-extrabold md:text-h1 print:text-[22pt] print:leading-[1.1] print:tracking-normal">
              {basics.name}
            </h1>
            <p className="mt-2 font-display text-h3 font-medium text-dim print:mt-[2pt] print:text-[11.5pt] print:leading-[1.3] print:tracking-normal">
              {basics.role}
            </p>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-small text-dim print:mt-[4pt] print:justify-center print:gap-x-[12pt] print:gap-y-0 print:text-[10pt]">
              {contact.map((c) => (
                <li key={c.label}>{c.href ? <a href={c.href}>{c.label}</a> : c.label}</li>
              ))}
            </ul>
          </div>
          <div className="flex gap-4 print:hidden">
            <ButtonLink href={CV_PDF_URL} variant="primary">
              Download PDF
            </ButtonLink>
          </div>
        </div>

        {show(basics.headline) && (
          <Section title="Profile">
            <p className="max-w-prose print:max-w-none">{basics.headline}</p>
          </Section>
        )}

        <Section title="Experience">
          <ul className="space-y-8 print:space-y-[7pt]">
            {resume.experience.map((job) => (
              <ExperienceItem key={`${job.company}-${job.start}`} job={job} />
            ))}
          </ul>
        </Section>

        {education.length > 0 && (
          <Section title="Education">
            <ul className="space-y-4 print:space-y-[4pt]">
              {education.map((e) => (
                <li key={e.institution} className="print:break-inside-avoid">
                  <EntryHead title={e.institution} right={period(e.start, e.end)} />
                  {show(e.degree) && <p className="mt-1 print:mt-0">{e.degree}</p>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {projects.length > 0 && (
          <Section title="Projects">
            <ul className="space-y-8 print:space-y-[7pt]">
              {projects.map((p) => (
                <ProjectItem key={p.slug} project={p} />
              ))}
            </ul>
          </Section>
        )}

        {skills.length > 0 && (
          <Section title="Skills">
            <ul className="space-y-2 print:space-y-0">
              {skills.map((g) => (
                <li key={g.group}>
                  <span className="font-display font-medium">{g.group}:</span> {g.items.filter(show).join(", ")}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {certificates.length > 0 && (
          <Section title="Certificates">
            <ul className="space-y-2 print:space-y-0">
              {certificates.map((c) => (
                <li key={c.name}>
                  {c.name}, {c.issuer}
                  {show(c.year) ? ` (${c.year})` : ""}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {languages.length > 0 && (
          <Section title="Languages">
            <p>{languages.map((l) => `${l.language} (${l.level})`).join(", ")}</p>
          </Section>
        )}

        {pending.length > 0 && (
          <aside className="mt-16 rounded-box border border-amber/40 p-4 text-small text-dim print:hidden">
            <p className="font-display font-medium text-amber">
              Development only: {pending.length} content fields still pending in resume.yaml
            </p>
            <ul className="mt-2 break-all font-mono sm:columns-2">
              {pending.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </aside>
        )}
      </article>
    </div>
  );
}
