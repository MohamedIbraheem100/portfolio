import { describe, expect, it } from "vitest";
import { applyEvent, currentStep, newRun, type FitRun } from "./fit-run";

/* The production stream, in the order it arrives. */
const STREAM: [string, Record<string, unknown>][] = [
  ["stage", { stage: "rubric", status: "running" }],
  [
    "stage",
    {
      stage: "rubric",
      status: "done",
      job_title: "AI Engineer",
      criteria: 2,
      requirements: [
        { name: "LangGraph in production", type: "must_have" },
        { name: "Kubernetes", type: "nice_to_have" },
        { name: "", type: "must_have" }, // unusable: dropped
      ],
    },
  ],
  ["stage", { stage: "screening", status: "running" }],
  ["stage", { stage: "screening", status: "done" }],
  ["progress", { node: "parse", status: "done" }],
  ["progress", { node: "redact", status: "running" }],
  ["progress", { node: "redact", status: "skipped" }],
  ["progress", { node: "extract", status: "running" }],
  ["progress", { node: "judge", status: "running" }],
  ["progress", { node: "judge", status: "done" }],
  ["progress", { node: "extract", status: "done" }],
  ["progress", { node: "verify", status: "running" }],
  ["progress", { node: "verify", status: "done" }],
  ["progress", { node: "score", status: "running" }],
  ["progress", { node: "score", status: "done" }],
  ["progress", { node: "explain", status: "running" }],
  ["progress", { node: "explain", status: "done" }],
];

const play = (count: number): FitRun =>
  STREAM.slice(0, count).reduce((run, [event, p]) => applyEvent(run, event, p), newRun());

describe("fit run", () => {
  it("starts with every step pending and names the first one", () => {
    const run = newRun();
    expect(Object.values(run.steps).every((s) => s === "pending")).toBe(true);
    expect(currentStep(run)).toBe("rubric");
  });

  it("exposes the rubric's requirements as soon as it is done", () => {
    const run = play(2);
    expect(run.steps.rubric).toBe("done");
    expect(run.rubric).toEqual({
      jobTitle: "AI Engineer",
      requirements: [
        { name: "LangGraph in production", type: "must_have" },
        { name: "Kubernetes", type: "nice_to_have" },
      ],
    });
  });

  it("covers the gap after the rubric: the screening step runs, then parsing starts", () => {
    expect(currentStep(play(3))).toBe("screening");
    const run = play(4);
    expect(run.steps.screening).toBe("done");
    expect(run.steps.parse).toBe("running");
  });

  it("ignores the redaction node and names the furthest running step", () => {
    const run = play(9);
    expect(Object.keys(run.steps)).not.toContain("redact");
    expect(run.steps.extract).toBe("running");
    expect(currentStep(run)).toBe("judge");
  });

  it("never moves a step backwards", () => {
    const run = applyEvent(play(10), "progress", { node: "judge", status: "running" });
    expect(run.steps.judge).toBe("done");
  });

  it("marks everything done on the result and then ignores later events", () => {
    const run = applyEvent(play(STREAM.length), "result", {});
    expect(Object.values(run.steps).every((s) => s === "done")).toBe(true);
    expect(run.ended).toBe(true);
    expect(currentStep(run)).toBeNull();
    expect(applyEvent(run, "progress", { node: "judge", status: "running" })).toBe(run);
  });

  it("ends on an error without pretending the steps finished", () => {
    const run = applyEvent(play(3), "error", { detail: "down" });
    expect(run.ended).toBe(true);
    expect(run.steps.screening).toBe("running");
    expect(run.steps.judge).toBe("pending");
  });
});
