import { isTodo, type Resume } from "@/lib/resume";

/*
  Plain-text CV rendered from resume.yaml. Served at /cv.txt and sent to Mizan by
  Recruiter Mode (the API fetches it), so the screening quotes the same lines a
  visitor can read. One fact per line: Mizan cites evidence by line.
  Anything still marked TODO(content) is left out.
*/
const show = (v: string | null | undefined): v is string => Boolean(v) && !isTodo(v);

function period(start: string, end: string | null): string {
  const from = show(start) ? start : "";
  const to = end === null ? "present" : show(end) ? end : "";
  return from && to ? `${from} to ${to}` : from || to;
}

export function resumeToText(resume: Resume): string {
  const { basics } = resume;
  const out: string[] = [];
  const line = (s = "") => out.push(s);

  line(basics.name);
  line(basics.role);
  const profile = show(basics.profile) ? basics.profile : basics.headline;
  if (show(profile)) line(profile);
  if (show(basics.location)) line(`Location: ${basics.location}`);
  if (show(basics.email)) line(`Email: ${basics.email}`);
  if (show(basics.links.linkedin)) line(`LinkedIn: ${basics.links.linkedin}`);
  if (show(basics.links.github)) line(`GitHub: ${basics.links.github}`);

  line();
  line("EXPERIENCE");
  for (const job of resume.experience) {
    const title = show(job.title) ? `${job.title}, ` : "";
    const when = period(job.start, job.end);
    line(`${title}${job.company}${when ? ` (${when})` : ""}`);
    for (const impact of job.impact.filter(show)) line(`- ${impact}`);
  }

  line();
  line("PROJECTS");
  for (const p of resume.projects) {
    if (!show(p.one_liner)) continue;
    line(`${p.name}: ${p.one_liner}`);
    if (show(p.role)) line(`- Role: ${p.role}`);
    for (const r of p.results.filter(show)) line(`- ${r}`);
    const stack = p.stack.filter(show);
    if (stack.length) line(`- Stack: ${stack.join(", ")}`);
    if (show(p.links.live)) line(`- Live: ${p.links.live}`);
    if (show(p.links.repo)) line(`- Source: ${p.links.repo}`);
  }

  const education = resume.education.filter((e) => show(e.institution));
  if (education.length) {
    line();
    line("EDUCATION");
    for (const e of education) {
      const when = period(e.start, e.end);
      line(`${show(e.degree) ? `${e.degree}, ` : ""}${e.institution}${when ? ` (${when})` : ""}`);
    }
  }

  const skills = resume.skills.filter((g) => g.items.some(show));
  if (skills.length) {
    line();
    line("SKILLS");
    for (const g of skills) line(`${g.group}: ${g.items.filter(show).join(", ")}`);
  }

  const certs = resume.certificates.filter((c) => show(c.name));
  if (certs.length) {
    line();
    line("CERTIFICATES");
    for (const c of certs) line(`${c.name}, ${c.issuer}${show(c.year) ? ` (${c.year})` : ""}`);
  }

  const languages = resume.languages.filter((l) => show(l.level));
  if (languages.length) {
    line();
    line("LANGUAGES");
    line(languages.map((l) => `${l.language} (${l.level})`).join(", "));
  }

  return out.join("\n") + "\n";
}
