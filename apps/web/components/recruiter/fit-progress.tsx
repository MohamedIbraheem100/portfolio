import { PIPELINE, currentStep, type FitRun, type StepStatus } from "@/lib/fit-run";

/*
  Live status for Recruiter Mode. The whole pipeline is listed from the first
  second, so the visitor always sees what is running, what is done and what is
  left: a spinner on the step being worked on, a check on each finished one.
  No clocks and no durations (owner's call): the steps moving are the progress.
*/

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "running") {
    return <span aria-hidden="true" className="fit-spinner mt-[0.3rem] block size-3" />;
  }
  if (status === "done") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 12 12"
        className="mt-[0.3rem] size-3 text-phosphor"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 6.5 4.8 9 10 3" />
      </svg>
    );
  }
  return (
    <span aria-hidden="true" className="mt-[0.3rem] flex size-3 items-center justify-center">
      <span className="block size-1 rounded-full bg-dim" />
    </span>
  );
}

export function FitProgress({ run, slow }: { run: FitRun; slow: boolean }) {
  const current = currentStep(run);
  const headline = PIPELINE.find((s) => s.id === current)?.label ?? "Finishing";

  return (
    <div>
      {run.ended ? (
        <p role="status" className="font-display text-lead font-medium text-phosphor">
          Screening complete
        </p>
      ) : (
        <>
          <p role="status" aria-live="polite" className="flex items-start gap-3">
            <span aria-hidden="true" className="fit-spinner mt-[0.45rem] block size-4 shrink-0" />
            <span className="status-shimmer font-display text-lead font-medium">{headline}</span>
          </p>
          {slow && <p className="mt-2 text-small text-dim">Still working. This one is taking a little longer than usual.</p>}
        </>
      )}

      <ol aria-label="Progress" className="mt-6 space-y-3">
        {PIPELINE.map((s) => {
          const status = run.steps[s.id];
          const label =
            s.id === "rubric" && status === "done" && run.rubric
              ? `Rubric: ${run.rubric.requirements.length} requirements for ${run.rubric.jobTitle || "this role"}`
              : s.label;
          return (
            <li key={s.id} data-status={status} className="grid grid-cols-[0.75rem_1fr] gap-x-3">
              <StepIcon status={status} />
              <span className={`text-small ${status === "running" ? "text-phosphor" : "text-dim"}`}>
                {label}
                <span className="sr-only">
                  {status === "done" ? " (done)" : status === "running" ? " (running)" : " (waiting)"}
                </span>
              </span>
              {status === "running" && (
                <span className="col-start-2 mt-1 max-w-prose text-small text-dim">{s.detail}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
