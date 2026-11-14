import { expect, test, type Page } from "@playwright/test";

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

const RUBRIC_DONE = {
  stage: "rubric",
  status: "done",
  job_title: "AI Engineer",
  criteria: 2,
  requirements: [
    { name: "LangGraph in production", type: "must_have" },
    { name: "Kubernetes", type: "nice_to_have" },
  ],
};

/* Session token and warm-up are always answered locally; each test routes /api/fit itself. */
async function mockApi(page: Page) {
  await page.route("**/api/session", (route) =>
    route.fulfill({ json: { token: "t.t.t", expires: 9999999999 } }),
  );
  await page.route("**/api/fit/warm", (route) => route.fulfill({ json: { warm: true } }));
}

test("home shows the name, the sections and the Recruiter Mode action", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Mohamed Ibrahim" })).toBeVisible();
  for (const id of ["work", "experience", "process", "contact"]) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
  const cta = page.getByRole("link", { name: "Screen my CV against your role" });
  await expect(cta).toHaveAttribute("href", "/fit");
  await expect(page.getByRole("link", { name: "CV", exact: true })).toHaveAttribute("href", "/cv");
  await expect(page.getByRole("button", { name: "Ask my AI twin" })).toBeVisible();
  // SpotLight shows its video: a poster, and nothing downloaded before it is needed
  const clip = page.locator("#spotlight video");
  await expect(clip).toHaveAttribute("poster", "/work/spotlight-poster.webp");
  await expect(clip).toHaveAttribute("preload", "none");
  // Cashy offers its live demo: samples and an upload, and no model is downloaded until asked
  const cashy = page.locator("#cashy");
  await expect(cashy.getByText("Try it live")).toBeVisible();
  await expect(cashy.getByRole("button", { name: /^Try the / })).toHaveCount(4);
  await expect(cashy.getByRole("button", { name: "Use your own photo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Chat with my AI twin" })).toBeVisible();
});

test("the CV page and the plain-text CV render from resume.yaml", async ({ page, request }) => {
  await page.goto("/cv");
  await expect(page.getByRole("heading", { level: 1, name: "Mohamed Ibrahim" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Experience" })).toBeVisible();

  // The PDF is this page printed: the name and the contact line must survive, the site chrome must not.
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("heading", { level: 1, name: "Mohamed Ibrahim" })).toBeVisible();
  await expect(page.locator('main a[href^="mailto:"]').first()).toBeVisible();
  await expect(page.getByRole("banner")).toBeHidden();
  await expect(page.getByRole("contentinfo")).toBeHidden();
  await expect(page.getByRole("link", { name: "Download PDF" })).toBeHidden();
  await page.emulateMedia({ media: "screen" });

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
  await mockApi(page);
  await page.route("**/api/fit", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: sse([
        ["stage", { stage: "rubric", status: "running" }],
        ["stage", RUBRIC_DONE],
        ["stage", { stage: "screening", status: "running" }],
        ["stage", { stage: "screening", status: "done" }],
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

  // the finished checklist stays as the record of the run: every step done, the rubric named
  const progress = page.getByRole("list", { name: "Progress" });
  await expect(progress.getByRole("listitem")).toHaveCount(8);
  await expect(progress.locator('li[data-status="done"]')).toHaveCount(8);
  await expect(progress.getByText("Rubric: 2 requirements for AI Engineer")).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Screening complete");
  // no clocks or durations are shown to the visitor (FIT_RESULT.duration_ms is 4000)
  await expect(page.getByText(/\d\.\d s\b/)).toHaveCount(0);
  await expect(page.getByLabel("Requirements found in the role")).toHaveCount(0);
});

test("Recruiter Mode: the wait is narrated step by step and can be stopped", async ({ page }) => {
  await mockApi(page);
  // The stream opens, delivers the rubric and the first pipeline step, then stays open.
  await page.addInitScript((body) => {
    const original = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (!url.endsWith("/api/fit")) return original(input, init);
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(body));
          init?.signal?.addEventListener("abort", () => controller.error(new DOMException("aborted", "AbortError")));
        },
      });
      return Promise.resolve(new Response(stream, { headers: { "Content-Type": "text/event-stream" } }));
    };
  }, sse([
    ["stage", { stage: "rubric", status: "running" }],
    ["stage", RUBRIC_DONE],
    ["stage", { stage: "screening", status: "running" }],
    ["stage", { stage: "screening", status: "done" }],
    ["progress", { node: "parse", status: "done" }],
    ["progress", { node: "extract", status: "running" }],
    ["progress", { node: "judge", status: "running" }],
  ]));

  await page.goto("/fit");
  await page.getByRole("button", { name: "AI Engineer (agents)" }).click();
  await page.getByRole("button", { name: "Screen my CV" }).click();

  // the status line names the furthest step that is running
  await expect(page.getByRole("status")).toHaveText("Judging each requirement");
  const progress = page.getByRole("list", { name: "Progress" });
  await expect(progress.locator('li[data-status="done"]')).toHaveCount(3);
  await expect(progress.locator('li[data-status="running"]')).toHaveCount(2);
  await expect(progress.locator('li[data-status="pending"]')).toHaveCount(3);
  // the role's requirements are on screen long before the verdicts
  const skeleton = page.getByLabel("Requirements found in the role");
  await expect(skeleton.getByText("LangGraph in production")).toBeVisible();
  await expect(skeleton.getByText("Kubernetes")).toBeVisible();
  await expect(page.getByLabel("Fit report")).toHaveCount(0);

  await page.getByRole("button", { name: "Stop" }).click();
  await expect(progress).toHaveCount(0);
  await expect(skeleton).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Screen my CV" })).toBeEnabled();
});

test("Recruiter Mode: when Mizan is unavailable there is a message and no score", async ({ page }) => {
  await mockApi(page);
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
  await expect(page.getByRole("list", { name: "Progress" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Download CV" }).first()).toBeVisible();
});

test("AI twin: the chat opens from the hero, answers, and follows the visitor to another page", async ({ page }) => {
  await mockApi(page);
  let asked = 0;
  await page.route("**/api/chat", (route) => {
    asked += 1;
    return route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: sse([
        ["status", { state: "thinking" }],
        ["answer", { text: "I am open to a new role now. My notice period is 14 days.", lang: "en", source: "model" }],
        ["done", {}],
      ]),
    });
  });

  await page.goto("/");
  await expect(page.getByRole("dialog")).toHaveCount(0); // the panel is not on the page until asked for
  await page.getByRole("button", { name: "Ask my AI twin" }).click();
  const chat = page.getByRole("dialog", { name: "Chat with Mohamed's AI twin" });
  await expect(chat.getByText("An AI trained on Mohamed’s work.")).toBeVisible();

  await chat.getByRole("button", { name: "Are you available, and which roles are you looking for?" }).click();
  const conversation = chat.getByRole("list", { name: "Conversation" });
  await expect(conversation.getByText("My notice period is 14 days.")).toBeVisible();
  expect(asked).toBe(1);

  // the page behind stays usable, and the conversation survives a move to another page
  await page.getByRole("link", { name: "CV", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Mohamed Ibrahim" })).toBeVisible();
  await expect(conversation.getByRole("listitem")).toHaveCount(2);

  // closed and reopened from the floating button, nothing is lost
  await chat.getByRole("button", { name: "Close chat" }).click();
  await expect(chat).toHaveCount(0);
  await page.getByRole("button", { name: "Chat with my AI twin" }).click();
  await expect(conversation.getByRole("listitem")).toHaveCount(2);
});

test("AI twin: a refused request shows the reason and keeps the chat usable", async ({ page }) => {
  await mockApi(page);
  await page.route("**/api/chat", (route) =>
    route.fulfill({ status: 429, json: { detail: "You have reached today's limit for this feature. Please email me instead." } }),
  );
  await page.goto("/fit");
  await page.getByRole("button", { name: "Chat with my AI twin" }).click();
  const chat = page.getByRole("dialog", { name: "Chat with Mohamed's AI twin" });
  await chat.getByLabel("Your question").fill("Are you available?");
  await chat.getByRole("button", { name: "Send" }).click();
  await expect(chat.getByRole("alert")).toContainText("today's limit");
  await expect(chat.getByLabel("Your question")).toBeEnabled();
});
