import { defineConfig, devices } from "@playwright/test";

/*
  Smoke tests (CLAUDE.md CI row). They run against a production build served by
  `next start`, in Chromium only: the goal is "the pages open and the main flows
  render", not cross-browser coverage. Calls to /api/* are intercepted in the
  tests, so no backend, LLM or Mizan is needed.
*/
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
