import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

/*
  resume.yaml is the single source of truth (P5). This module validates it and
  exposes two views:
  - `resume`: the raw, validated data (TODO markers included).
  - `isTodo(value)`: a value the owner has not filled yet. Components hide those
    from visitors; `pendingContent()` lists them for the dev-only notice.
*/

const TODO_PREFIX = "TODO(content)";
export const isTodo = (v: unknown): boolean => typeof v === "string" && v.startsWith(TODO_PREFIX);

const text = z.string().min(1);
const dateish = z.string().min(1); // "YYYY-MM", "YYYY" or a TODO marker
const link = text.optional();

const Basics = z.object({
  name: text,
  role: text,
  headline: text,
  location: text,
  email: text,
  links: z.object({ github: link, linkedin: link, site: link }),
  availability: text,
});

const Highlight = z.object({ value: text, context: text, project: text });

const Experience = z.object({
  company: text,
  title: text,
  start: dateish,
  end: dateish.nullable(),
  location: text,
  impact: z.array(text).min(1),
  public_notes: text.optional(),
});

const Project = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: text,
  flagship: z.boolean().optional(),
  one_liner: text,
  role: text,
  stack: z.array(text).min(1),
  results: z.array(text).min(1),
  what_failed: text,
  links: z.object({ live: link, repo: link }),
  demo: z.enum(["live", "video", "case-study"]),
});

const Education = z.object({ institution: text, degree: text, start: dateish, end: dateish });
const SkillGroup = z.object({ group: text, items: z.array(text).min(1) });
const Language = z.object({ language: text, level: text });
const Certificate = z.object({ name: text, issuer: text, year: dateish });

export const ResumeSchema = z.object({
  basics: Basics,
  highlights: z.array(Highlight),
  experience: z.array(Experience).min(1),
  projects: z.array(Project).min(1),
  education: z.array(Education),
  skills: z.array(SkillGroup),
  certificates: z.array(Certificate).default([]),
  languages: z.array(Language),
});

export type Resume = z.infer<typeof ResumeSchema>;
export type Project = z.infer<typeof Project>;
export type Experience = z.infer<typeof Experience>;

export function parseResume(yamlText: string): Resume {
  return ResumeSchema.parse(parse(yamlText));
}

export function loadResume(): Resume {
  const file = join(process.cwd(), "content", "resume.yaml");
  return parseResume(readFileSync(file, "utf8"));
}

/** Dotted paths of every TODO(content) marker, for the dev-only notice and the content checklist. */
export function pendingContent(value: unknown, path = ""): string[] {
  if (isTodo(value)) return [path];
  if (Array.isArray(value)) return value.flatMap((v, i) => pendingContent(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) =>
      pendingContent(v, path ? `${path}.${k}` : k),
    );
  }
  return [];
}

/** Project slugs are the /work/[slug] routes and the highlight targets; they must be unique. */
export function assertConsistent(resume: Resume): void {
  const slugs = resume.projects.map((p) => p.slug);
  const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
  if (dupes.length) throw new Error(`Duplicate project slugs: ${dupes.join(", ")}`);
  for (const h of resume.highlights) {
    if (!isTodo(h.project) && !slugs.includes(h.project)) {
      throw new Error(`Highlight "${h.value}" points at unknown project "${h.project}"`);
    }
  }
}
