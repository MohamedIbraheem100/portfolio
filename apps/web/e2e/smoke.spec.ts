import { expect, test } from "@playwright/test";

/*
  Smoke tests: every public page opens, the hero leads to Recruiter Mode, and the
  fit report renders evidence before gaps before the score. /api/* is intercepted.
*/

const FIT_RESULT = {
  job_title: "AI Engineer",
  language: "en",
  met: [
    {
      name: "LangGraph in production",
      type: "must_have",
      verdict: "met",
      evidence: [{ quote: "Built agentic RAG workflows with LangGraph" }],
      reasoning: "Direct statement.",
    },
  ],
  gaps: [
    { name: "Kubernetes", type: "nice_to_have", verdict: "no_evidence", evidence: [], reasoning: "Not in the CV." },
  ],
  summary: "Strong on agents.",
  score: 80,
  must_haves_met: true,
  quotes_checked: 1,
  quotes_verified: 1,
  duration_ms: 4000,
  cached: false,
};

const sse = (events: [string, unknown][]) =>
  events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join("");

test("home shows the name, the sections and the Recruiter Mode action", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Mohamed Ibrahim" })).toBeVisible();
  for (const id of ["work", "experience", "process", "contact"]) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
  const cta = page.getByRole("link", { name: "Screen my CV against your role" });
  await expect(cta).toHaveAttribute("href", "/fit");
  await expect(page.getByRole("link", { name: "CV", exact: true })).toHaveAttribute("href", "/cv");
});

test("the CV page and the plain-text CV render from resume.yaml", async ({ page, request }) => {
  await page.goto("/cv");
  await expect(page.getByRole("heading", { level: 1, name: "Mohamed Ibrahim" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Experience" })).toBeVisible();

  const res = await request.get("/cv.txt");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("text/plain");
  const text = await res.text();
  expect(text).toContain("EXPERIENCE");
  expect(text).not.toContain("TODO(content)");
});

test("an unknown address answers 404 in the detector's words", async ({ page }) => {
  const res = await page.goto("/this-page-does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "No objects found." })).toBeVisible();
});

test("Recruiter Mode: example fills the form, the report is evidence first", async ({ page }) => {
  await page.route("**/api/session", (route) =>
    route.fulfill({ json: { token: "t.t.t", expires: 9999999999 } }),
  );
  await page.route("**/api/fit", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: sse([
        ["stage", { stage: "rubric", status: "running" }],
        ["stage", { stage: "rubric", status: "done", job_title: "AI Engineer", criteria: 2 }],
        ["progress", { node: "judge", status: "running" }],
        ["result", FIT_RESULT],
      ]),
    }),
  );

  await page.goto("/fit");
  const submit = page.getByRole("button", { name: "Screen my CV" });
  await expect(submit).toBeDisabled(); // nothing pasted yet
  await page.getByRole("button", { name: "AI Engineer (agents)" }).click();
  await expect(submit).toBeEnabled();
  await submit.click();

  const report = page.getByLabel("Fit report");
  await expect(report).toBeVisible();
  await expect(report.getByText("Built agentic RAG workflows with LangGraph")).toBeVisible();
  // evidence, then gaps, then the score
  const order = await report.evaluate((el) => {
    const t = (el as HTMLElement).innerText;
    return [t.indexOf("What the CV shows"), t.indexOf("Gaps"), t.indexOf("Score")];
  });
  expect(order[0]).toBeGreaterThanOrEqual(0);
  expect(order[0]).toBeLessThan(order[1]);
  expect(order[1]).toBeLessThan(order[2]);
  await expect(report.getByText("Powered by Mizan, which I built.")).toBeVisible();
});

test("Recruiter Mode: when Mizan is unavailable there is a message and no score", async ({ page }) => {
  await page.route("**/api/session", (route) =>
    route.fulfill({ json: { token: "t.t.t", expires: 9999999999 } }),
  );
  await page.route("**/api/fit", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: sse([
        ["stage", { stage: "rubric", status: "running" }],
        ["error", { detail: "Mizan is not available right now, so there is no result to show." }],
      ]),
    }),
  );
  await page.goto("/fit");
  await page.getByRole("button", { name: "Computer Vision Engineer" }).click();
  await page.getByRole("button", { name: "Screen my CV" }).click();
  await expect(page.getByText("Mizan is not available right now")).toBeVisible();
  await expect(page.getByLabel("Fit report")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Download CV" }).first()).toBeVisible();
});
