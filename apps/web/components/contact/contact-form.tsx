"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";

/*
  Contact form -> POST /api/contact (proxied to the API). Before sending it
  fetches a short-lived session token from /api/session (D10). The "website"
  field is a honeypot: visually hidden, never filled by people. Errors from
  the API are shown verbatim; they are written for visitors.
*/
type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

const field =
  "w-full rounded-box border border-phosphor/20 bg-night-raised px-4 py-3 text-body text-phosphor placeholder:text-dim/70 focus:border-amber";

export function ContactForm({ fallbackEmail }: { fallbackEmail: string }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setState({ kind: "sending" });
    try {
      const session = await fetch("/api/session", { cache: "no-store" });
      if (!session.ok) throw new Error("Could not start a session. Please email me directly.");
      const { token } = (await session.json()) as { token: string };
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          message: data.get("message"),
          website: data.get("website") ?? "",
          token,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { detail?: unknown } | null;
        const detail = typeof body?.detail === "string" ? body.detail : "Could not send. Please email me directly.";
        throw new Error(detail);
      }
      form.reset();
      setState({ kind: "sent" });
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Could not send." });
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" aria-describedby="contact-status">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-small text-dim">
          Name
          <input name="name" required maxLength={80} autoComplete="name" className={field} />
        </label>
        <label className="grid gap-1.5 text-small text-dim">
          Email
          <input name="email" type="email" required maxLength={254} autoComplete="email" className={field} />
        </label>
      </div>
      <label className="grid gap-1.5 text-small text-dim">
        Message
        <textarea name="message" required minLength={10} maxLength={2000} rows={6} className={field} />
      </label>
      {/* Honeypot: off-screen, not focusable, ignored by assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={state.kind === "sending"}
          className="inline-flex h-12 items-center justify-center rounded-box bg-amber px-5 font-display text-body font-medium leading-none text-night transition-colors hover:bg-[#ffc14a] disabled:opacity-60"
        >
          {state.kind === "sending" ? "Sending" : "Send"}
        </button>
        <p id="contact-status" role="status" aria-live="polite" className="text-small text-dim">
          {/* Motion only in response to the visitor (motion rule 3): the status fades in once. */}
          <LazyMotion features={domAnimation}>
            <AnimatePresence mode="wait">
              {state.kind === "sent" && (
                <m.span key="sent" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  Sent. I reply from {fallbackEmail}.
                </m.span>
              )}
              {state.kind === "error" && (
                <m.span key="error" className="text-amber" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {state.message}
                </m.span>
              )}
            </AnimatePresence>
          </LazyMotion>
        </p>
      </div>
    </form>
  );
}
