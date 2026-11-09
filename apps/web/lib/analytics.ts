import { track } from "@vercel/analytics";

/*
  The six product events (CLAUDE.md quality bar). Nothing else is tracked, no
  properties that identify a visitor, and a failure to track never breaks the UI.
*/
export type ProductEvent =
  | "open_chat"
  | "send_message"
  | "run_fit"
  | "run_lab"
  | "download_cv"
  | "click_email";

export function trackEvent(name: ProductEvent): void {
  try {
    track(name);
  } catch {
    /* analytics must never throw into the page */
  }
}
