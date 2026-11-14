"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { EXAMPLE_JDS } from "@/components/recruiter/examples";
import { FitProgress } from "@/components/recruiter/fit-progress";
import { TrackLink } from "@/components/ui/track-link";
import { trackEvent } from "@/lib/analytics";
import { CV_PDF_URL } from "@/lib/cv";
import { applyEvent, newRun, type FitRun, type RubricPreview } from "@/lib/fit-run";
import { readSse } from "@/lib/sse";

/*
  Recruiter Mode (W3). The visitor pastes a job description; /api/fit streams
  Mizan's progress and then an evidence-first report (D12): what the CV shows,
  with the quoted line, then the honest gaps, then the score as the summary.
  If Mizan is unavailable the panel says so and offers the CV; it never shows a
  made-up score. The JD is processed and not stored (D11).

  The wait is narrated live: the whole pipeline is listed, with a spinner on the
  running step and a check on each finished one (fit-progress.tsx), and the
  role's requirements appear as the skeleton of the report as soon as the rubric
  exists. No clocks or durations anywhere (owner's call). Touching the form warms
  both serverless functions so the first step starts sooner.
*/

type Requirement = {
  name: string;
  type: string;
  verdict: string;
  evidence: { quote: string }[];
  reasoning: string;
};
type FitResult = {
  job_title: string;
  language: string;
  met: Requirement[];
  gaps: Requirement[];
  summary: string;
  score: number;
  must_haves_met: boolean;
  quotes_checked: number;
  quotes_verified: number;
  duration_ms: number;
  cached: boolean;
};
type State =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "result"; result: FitResult }
  | { kind: "error"; message: string };

const MIN = 30;
const MAX = 10_000;
const SLOW_AFTER_MS = 25_000;

const VERDICT: Record<string, string> = {
  met: "met",
  partial: "partly met",
  not_met: "not met",
  no_evidence: "no evidence in the CV",
};

function RequirementItem({ r }: { r: Requirement }) {
  return (
    <li className="border-t border-phosphor/10 py-5">
      <p className="font-display text-lead font-medium text-phosphor">
        {r.name}
        <span className="ml-3 align-middle font-body text-small font-normal text-dim">
          {typeLabel(r.type)} · {VERDICT[r.verdict] ?? r.verdict}
        </span>
      </p>
      {r.evidence.map((e) => (
        <blockquote key={e.quote} className="mt-3 max-w-prose border-l-2 border-amber pl-4 text-body text-phosphor">
          {e.quote}
        </blockquote>
      ))}
      {r.reasoning && <p className="mt-2 max-w-prose text-small text-dim">{r.reasoning}</p>}
    </li>
  );
}

const typeLabel = (type: string) => (type === "must_have" ? "must-have" : "nice-to-have");

/* Shown while the screening runs: the rubric's requirements, in the place the report will take. */
function RubricSkeleton({ rubric }: { rubric: RubricPreview }) {
  return (
    <div className="md:col-span-12" aria-label="Requirements found in the role">
      <h2 className="font-display text-h2 font-extrabold text-phosphor">{rubric.jobTitle || "This role"}</h2>
      <p className="mt-4 max-w-prose text-body text-dim">
        {rubric.requirements.length} requirements found in the role. Each one is now being checked against
        my CV.
      </p>
      <ul className="mt-6">
        {rubric.requirements.map((r, i) => (
          <li key={`${i}-${r.name}`} className="border-t border-phosphor/10 py-4">
            <p className="font-display text-lead font-medium text-phosphor">
              {r.name}
              <span className="ml-3 align-middle font-body text-small font-normal text-dim">
                {typeLabel(r.type)} · checking
              </span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RecruiterPanel({ email }: { email: string | null }) {
  const [jd, setJd] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [run, setRun] = useState<FitRun | null>(null);
  const [slow, setSlow] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const warmed = useRef(false);
  const statusRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const running = state.kind === "running";

  // A run that outlasts the usual wait gets one reassuring line, not a clock.
  useEffect(() => {
    if (!running) return;
    const id = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [running]);

  useEffect(() => () => abort.current?.abort(), []);

  // First touch of the form: wake the API and Mizan (cold serverless functions cost seconds).
  function warm() {
    if (warmed.current) return;
    warmed.current = true;
    fetch("/api/fit/warm", { cache: "no-store" }).catch(() => {});
  }

  function stop() {
    abort.current?.abort();
    setRun(null);
    setState({ kind: "idle" });
  }

  const length = jd.trim().length;
  const valid = length >= MIN && length <= MAX;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || state.kind === "running") return;
    trackEvent("run_fit");
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setSlow(false);
    setRun(newRun());
    setState({ kind: "running" });
    // On a phone the status sits below the form: bring it into view.
    requestAnimationFrame(() => statusRef.current?.scrollIntoView({ block: "nearest" }));
    let finished = false;
    try {
      const session = await fetch("/api/session", { cache: "no-store", signal: controller.signal });
      if (!session.ok) throw new Error("Could not start a session. Please reload the page.");
      const { token } = (await session.json()) as { token: string };
      const res = await fetch("/api/fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jd_text: jd.trim(), token }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { detail?: unknown } | null;
        throw new Error(
          typeof body?.detail === "string" ? body.detail : "The screening could not start. Please try again.",
        );
      }
      await readSse(
        res,
        ({ event, data }) => {
          const p = JSON.parse(data) as Record<string, unknown>;
          setRun((r) => r && applyEvent(r, event, p));
          if (event === "result") {
            finished = true;
            setState({ kind: "result", result: p as unknown as FitResult });
            requestAnimationFrame(() => reportRef.current?.focus());
          } else if (event === "error") {
            finished = true;
            setState({ kind: "error", message: String(p.detail ?? "Mizan is not available right now.") });
          }
        },
        controller.signal,
      );
      if (!finished && !controller.signal.aborted) {
        setState({ kind: "error", message: "The connection ended before a result arrived. Please try again." });
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      setState({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong." });
    }
  }

  const cached = state.kind === "result" && state.result.cached;
  const showProgress = run !== null && (running || (state.kind === "result" && !cached));

  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-8">
      <form onSubmit={onSubmit} className="md:col-span-7" aria-describedby="fit-privacy">
        <label htmlFor="jd" className="font-display text-lead font-medium text-phosphor">
          Job description
        </label>
        <textarea
          id="jd"
          name="jd"
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          onFocus={warm}
          rows={12}
          maxLength={MAX}
          placeholder="Paste the role's requirements here, in English or Arabic."
          className="mt-3 w-full rounded-box border border-phosphor/20 bg-night-raised px-4 py-3 text-body text-phosphor placeholder:text-dim/70 focus:border-amber"
        />
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3 text-small text-dim">
          <span>Or try one:</span>
          {EXAMPLE_JDS.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => {
                warm();
                setJd(ex.text);
              }}
              className="min-h-6 underline decoration-dim/50 underline-offset-4 hover:text-amber hover:decoration-amber"
            >
              {ex.label}
            </button>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <button
            type="submit"
            disabled={!valid || running}
            className="btn-sheen relative inline-flex h-12 items-center justify-center overflow-hidden rounded-box bg-amber px-5 font-display text-body font-medium leading-none text-night transition-colors hover:bg-[#ffc14a] active:scale-[0.98] disabled:opacity-50"
          >
            {running ? "Screening" : "Screen my CV"}
          </button>
          {running && (
            <button
              type="button"
              onClick={stop}
              className="text-body text-dim underline decoration-dim/50 underline-offset-4 hover:text-amber hover:decoration-amber"
            >
              Stop
            </button>
          )}
          <p className="text-small text-dim" aria-live="polite">
            {length > 0 && length < MIN && `${MIN - length} more characters needed.`}
          </p>
        </div>
        <p id="fit-privacy" className="mt-4 max-w-prose text-small text-dim">
          Your job description is processed and not stored. An identical text is answered from a 24-hour
          cache keyed by its hash, not by its content.
        </p>
      </form>

      <div ref={statusRef} className="md:col-span-5">
        {showProgress && <FitProgress run={run} slow={slow} />}
        {cached && (
          <p role="status" className="max-w-prose text-body text-dim">
            Answered from the 24-hour cache: this exact text was screened earlier, so nothing was run
            again.
          </p>
        )}
        {state.kind === "idle" && (
          <p className="max-w-prose text-body text-dim">
            Mizan turns the role into a weighted rubric, reads my CV against it, and only keeps a claim if the
            quoted line really is in the CV. You see what is met, what is missing, and then the score, and
            you can watch every step as it runs.
          </p>
        )}
        {state.kind === "error" && (
          <div role="alert" className="border-l-2 border-amber pl-4">
            <p className="max-w-prose text-body text-phosphor">{state.message}</p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
              <TrackLink event="download_cv" href={CV_PDF_URL} variant="quiet">
                Download CV
              </TrackLink>
              {email && (
                <TrackLink event="click_email" href={`mailto:${email}`} variant="text">
                  Email me
                </TrackLink>
              )}
            </div>
          </div>
        )}
      </div>

      {running && run?.rubric && run.rubric.requirements.length > 0 && <RubricSkeleton rubric={run.rubric} />}

      {state.kind === "result" && (
        <div ref={reportRef} tabIndex={-1} className="md:col-span-12" aria-label="Fit report">
          <h2 className="font-display text-h2 font-extrabold text-phosphor">
            {state.result.job_title || "Fit report"}
          </h2>

          <section className="mt-10" aria-labelledby="fit-met">
            <h3 id="fit-met" className="font-display text-h3 font-medium text-dim">
              What the CV shows
            </h3>
            {state.result.met.length > 0 ? (
              <ul className="mt-4">
                {state.result.met.map((r) => (
                  <RequirementItem key={r.name} r={r} />
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-body text-dim">Nothing in the CV supports this role&rsquo;s requirements.</p>
            )}
          </section>

          <section className="mt-12" aria-labelledby="fit-gaps">
            <h3 id="fit-gaps" className="font-display text-h3 font-medium text-dim">
              Gaps
            </h3>
            {state.result.gaps.length > 0 ? (
              <ul className="mt-4">
                {state.result.gaps.map((r) => (
                  <RequirementItem key={r.name} r={r} />
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-body text-dim">No gaps against this rubric.</p>
            )}
          </section>

          <section className="mt-12 border-t border-phosphor/10 pt-8" aria-labelledby="fit-score">
            <h3 id="fit-score" className="font-display text-h3 font-medium text-dim">
              Score
            </h3>
            <p className="mt-4 font-mono text-h2 text-phosphor">
              {state.result.score}
              <span className="text-lead text-dim"> / 100</span>
            </p>
            <p className="mt-2 font-mono text-small text-dim">
              must-haves {state.result.must_haves_met ? "met" : "not all met"} · quotes verified{" "}
              {state.result.quotes_verified} of {state.result.quotes_checked}
              {state.result.cached ? " · cached" : ""}
            </p>
            {state.result.summary && (
              <p className="mt-5 max-w-prose text-body text-phosphor">{state.result.summary}</p>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              {email && (
                <TrackLink event="click_email" href={`mailto:${email}`} variant="quiet">
                  Email me about this role
                </TrackLink>
              )}
              <TrackLink event="download_cv" href={CV_PDF_URL} variant="text">
                Download CV
              </TrackLink>
            </div>
            <p className="mt-8 text-small text-dim">
              Powered by Mizan, which I built.{" "}
              <a
                href="https://mizan-hr.vercel.app"
                target="_blank"
                rel="noopener"
                className="underline decoration-dim/50 underline-offset-4 hover:text-amber hover:decoration-amber"
              >
                See how it works
              </a>
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
