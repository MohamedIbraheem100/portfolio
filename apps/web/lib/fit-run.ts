/*
  The state of one Recruiter Mode run, built from the /api/fit event stream.
  Pure functions, so the panel only folds events in and renders.

  Order of the pipeline (Mizan): the rubric is built from the job description, a
  screening is opened, then parse -> extract + judge -> verify -> score -> explain.
*/
export type StepId = "rubric" | "screening" | "parse" | "extract" | "judge" | "verify" | "score" | "explain";
export type StepStatus = "pending" | "running" | "done";
export type RubricPreview = { jobTitle: string; requirements: { name: string; type: string }[] };
export type FitRun = {
  ended: boolean;
  steps: Record<StepId, StepStatus>;
  rubric?: RubricPreview;
};

/* Each detail line says what the step really does in Mizan, and whether it is an LLM or plain code. */
export const PIPELINE: readonly { id: StepId; label: string; detail: string }[] = [
  {
    id: "rubric",
    label: "Reading the role and building a rubric",
    detail: "An LLM turns the job description into weighted must-haves and nice-to-haves.",
  },
  {
    id: "screening",
    label: "Opening a screening",
    detail: "Fetching my CV as plain text and registering the rubric in Mizan.",
  },
  {
    id: "parse",
    label: "Reading my CV",
    detail: "Code, no LLM: the CV is split into numbered lines so every claim can cite one.",
  },
  {
    id: "extract",
    label: "Extracting my profile",
    detail: "An LLM builds a structured profile from the numbered lines.",
  },
  {
    id: "judge",
    label: "Judging each requirement",
    detail: "An LLM judges every requirement on its own and must quote the CV line behind its verdict.",
  },
  {
    id: "verify",
    label: "Checking every quote against the CV",
    detail: "Code, no LLM: a quote that is not in the line it cites is thrown out.",
  },
  {
    id: "score",
    label: "Scoring",
    detail: "Code, no LLM: arithmetic over the verified verdicts and the rubric's weights.",
  },
  {
    id: "explain",
    label: "Writing the summary",
    detail: "An LLM writes the short summary from the verified verdicts.",
  },
];

const isStep = (v: unknown): v is StepId => typeof v === "string" && PIPELINE.some((s) => s.id === v);

export function newRun(): FitRun {
  const steps = Object.fromEntries(PIPELINE.map((s) => [s.id, "pending"])) as Record<StepId, StepStatus>;
  return { ended: false, steps };
}

function set(run: FitRun, id: StepId, status: StepStatus): FitRun {
  const from = run.steps[id];
  // A step only moves forward: pending -> running -> done.
  if (from === status || from === "done" || (from === "running" && status === "pending")) return run;
  return { ...run, steps: { ...run.steps, [id]: status } };
}

function parseRubric(p: Record<string, unknown>): RubricPreview {
  const list = Array.isArray(p.requirements) ? p.requirements : [];
  return {
    jobTitle: typeof p.job_title === "string" ? p.job_title : "",
    requirements: list.flatMap((r) => {
      const item = r as { name?: unknown; type?: unknown } | null;
      return item && typeof item.name === "string" && item.name
        ? [{ name: item.name, type: typeof item.type === "string" ? item.type : "nice_to_have" }]
        : [];
    }),
  };
}

/* Fold one stream event into the run. Unknown events and nodes are ignored. */
export function applyEvent(run: FitRun, event: string, p: Record<string, unknown>): FitRun {
  if (run.ended) return run;
  if (event === "stage" && (p.stage === "rubric" || p.stage === "screening")) {
    if (p.status === "running") return set(run, p.stage, "running");
    if (p.status !== "done") return run;
    const next = set(run, p.stage, "done");
    if (p.stage === "rubric") return { ...next, rubric: parseRubric(p) };
    // The CV upload and its parsing begin the moment the screening exists.
    return set(next, "parse", "running");
  }
  if (event === "progress" && isStep(p.node)) {
    // "skipped" (Mizan's blind-mode redaction, off for the owner's public CV) is not a step here.
    if (p.status === "running" || p.status === "done") return set(run, p.node, p.status);
    return run;
  }
  if (event === "result") {
    const done = PIPELINE.reduce((r, s) => set(r, s.id, "done"), run);
    return { ...done, ended: true };
  }
  if (event === "error") return { ...run, ended: true };
  return run;
}

/* The step to name in the status line: the furthest one running, else the next one due. */
export function currentStep(run: FitRun): StepId | null {
  const running = PIPELINE.filter((s) => run.steps[s.id] === "running");
  if (running.length) return running[running.length - 1].id;
  return PIPELINE.find((s) => run.steps[s.id] === "pending")?.id ?? null;
}
