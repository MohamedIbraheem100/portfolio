import { isTodo, type Experience as Job, type Resume } from "@/lib/resume";
import { TimelineRule } from "@/components/experience/timeline-rule";

/*
  Experience: a timeline of impact, not duties (CLAUDE.md). Period on the left,
  role and company on the right, then the impact lines. Anything still marked
  TODO(content) is hidden; a job with no visible impact shows only its header.
*/
const show = (v: string | null | undefined): v is string => Boolean(v) && !isTodo(v);

function period(job: Job): string {
  const from = show(job.start) ? job.start : "";
  const to = job.end === null ? "present" : show(job.end) ? job.end : "";
  return from && to ? `${from} to ${to}` : from || to;
}

function Row({ job }: { job: Job }) {
  const impact = job.impact.filter(show);
  return (
    <li className="grid grid-cols-1 gap-3 border-t border-phosphor/10 py-8 md:grid-cols-12 md:gap-8">
      <p className="text-small text-dim md:col-span-3">{period(job)}</p>
      <div className="md:col-span-9">
        <h3 className="font-display text-lead font-medium text-phosphor">
          {show(job.title) ? `${job.title}, ` : ""}
          {job.company}
        </h3>
        {show(job.location) && <p className="mt-1 text-small text-dim">{job.location}</p>}
        {impact.length > 0 && (
          <ul className="mt-4 max-w-prose space-y-2">
            {impact.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}

export function Experience({ resume }: { resume: Resume }) {
  return (
    <section
      id="experience"
      aria-labelledby="experience-heading"
      className="mx-auto w-full max-w-site px-4 pt-20 md:px-8 md:pt-28"
    >
      <h2 id="experience-heading" className="font-display text-h3 font-medium text-dim">
        Experience
      </h2>
      <div id="experience-rows" className="relative mt-6 md:pl-8">
        <TimelineRule targetId="experience-rows" />
        <ul>
          {resume.experience.map((job) => (
            <Row key={`${job.company}-${job.start}`} job={job} />
          ))}
        </ul>
      </div>
    </section>
  );
}
