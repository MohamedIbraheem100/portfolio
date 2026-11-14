"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { trackEvent } from "@/lib/analytics";
import { readSse } from "@/lib/sse";

/*
  The AI twin's chat (W2). A floating panel, not a page: it stays beside the content
  so a visitor can ask and verify. On a phone it is a sheet over the lower part of
  the screen; the page above it still scrolls.

  The conversation lives in sessionStorage: it survives page changes and a reload,
  and it is gone when the tab closes. Nothing is stored on the server.
  /api/chat returns one whole answer that the API has already checked, so there is
  nothing to stream: while waiting, the panel shows a turning ring and "Thinking",
  with no clock (D32).
*/

type Message = { role: "user" | "assistant"; text: string; lang: "ar" | "en" };

const STORE_KEY = "twin:conversation";
const MAX_CHARS = 500;
const HISTORY_TURNS = 6;
const EMAIL = "mohamed.abdelwahed.ai@gmail.com";
const STARTERS = [
  "Introduce yourself in 30 seconds.",
  "What have you built that runs in production?",
  "Which project are you proudest of, and what was your part?",
  "Are you available, and which roles are you looking for?",
];

const isArabic = (text: string) => /[؀-ۿ]/.test(text);

const nowSeconds = () => Date.now() / 1000;

function loadConversation(): Message[] {
  try {
    const raw = window.sessionStorage.getItem(STORE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m): m is Message =>
        Boolean(m) && (m.role === "user" || m.role === "assistant") && typeof m.text === "string",
    );
  } catch {
    return []; // private mode or blocked storage: the chat still works, it just does not persist
  }
}

export function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Client-only component (loaded with ssr: false), so reading storage here is safe.
  const [messages, setMessages] = useState<Message[]>(loadConversation);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const token = useRef<{ value: string; expires: number } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORE_KEY, JSON.stringify(messages));
    } catch {
      /* see loadConversation */
    }
  }, [messages]);

  // Keep the newest message in view, and put the cursor in the field when the panel opens.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending, open]);
  useEffect(() => {
    if (open) field.current?.focus();
  }, [open]);
  useEffect(() => () => abort.current?.abort(), []);

  async function sessionToken(signal: AbortSignal): Promise<string> {
    const now = nowSeconds();
    if (token.current && token.current.expires - now > 60) return token.current.value;
    const res = await fetch("/api/session", { cache: "no-store", signal });
    if (!res.ok) throw new Error("Could not start a session. Please reload the page.");
    const body = (await res.json()) as { token: string; expires: number };
    token.current = { value: body.token, expires: body.expires };
    return body.token;
  }

  async function send(raw: string) {
    const question = raw.trim().slice(0, MAX_CHARS);
    if (!question || pending) return;
    trackEvent("send_message");
    const history = messages.slice(-HISTORY_TURNS).map(({ role, text }) => ({ role, text }));
    setMessages((m) => [...m, { role: "user", text: question, lang: isArabic(question) ? "ar" : "en" }]);
    setInput("");
    setNotice(null);
    setPending(true);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, history, token: await sessionToken(controller.signal) }),
        signal: controller.signal,
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) token.current = null;
        const body = (await res.json().catch(() => null)) as { detail?: unknown } | null;
        throw new Error(
          typeof body?.detail === "string" ? body.detail : "That did not go through. Please try again.",
        );
      }
      let answered = false;
      await readSse(
        res,
        ({ event, data }) => {
          if (event !== "answer") return;
          const p = JSON.parse(data) as { text: string; lang: "ar" | "en" };
          answered = true;
          setMessages((m) => [...m, { role: "assistant", text: p.text, lang: p.lang === "ar" ? "ar" : "en" }]);
        },
        controller.signal,
      );
      if (!answered && !controller.signal.aborted) {
        throw new Error("The connection ended before an answer arrived. Please try again.");
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setNotice(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setPending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    } else if (e.key === "Escape") {
      onClose();
    }
  }
  function clear() {
    abort.current?.abort();
    setMessages([]);
    setNotice(null);
    setPending(false);
  }

  if (!open) return null;

  return (
    <section
      role="dialog"
      aria-label="Chat with Mohamed's AI twin"
      className="fixed inset-x-0 bottom-0 z-50 flex h-[72dvh] flex-col rounded-t-box border border-phosphor/20 bg-night-raised shadow-[0_18px_60px_rgba(0,0,0,0.55)] md:inset-x-auto md:bottom-6 md:right-6 md:h-[34rem] md:max-h-[calc(100dvh-3rem)] md:w-[24rem] md:rounded-box print:hidden"
    >
      <header className="flex items-start justify-between gap-3 border-b border-phosphor/10 px-4 py-3">
        <div>
          <p className="font-display text-body font-medium text-phosphor">Mohamed&rsquo;s AI twin</p>
          <p className="mt-1 text-small text-dim">
            An AI trained on Mohamed&rsquo;s work. For anything important,{" "}
            <a
              href={`mailto:${EMAIL}`}
              onClick={() => trackEvent("click_email")}
              className="underline decoration-dim/60 underline-offset-4 hover:text-amber hover:decoration-amber"
            >
              email him
            </a>
            .
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="h-9 px-2 text-small text-dim underline decoration-dim/50 underline-offset-4 hover:text-amber hover:decoration-amber"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="flex size-9 items-center justify-center rounded-box text-dim hover:text-amber"
          >
            <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M2 2l8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>
      </header>

      <div ref={scroller} data-lenis-prevent className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4">
        {messages.length === 0 && !pending && (
          <div>
            <p className="text-small text-dim">Ask about my work, projects, skills or availability. Try one:</p>
            <ul className="mt-3 space-y-2">
              {STARTERS.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => void send(q)}
                    className="w-full rounded-box border border-phosphor/15 px-3 py-2 text-left text-small text-phosphor transition-colors duration-150 hover:border-amber hover:text-amber"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ol aria-live="polite" aria-label="Conversation" className="space-y-4">
          {messages.map((m, i) => (
            <li
              key={i}
              lang={m.lang}
              dir={m.lang === "ar" ? "rtl" : "ltr"}
              className={
                m.role === "user"
                  ? "ml-10 rounded-box bg-night px-3 py-2 text-small text-phosphor"
                  : "border-l-2 border-amber pl-3 text-small text-phosphor [&[dir=rtl]]:border-l-0 [&[dir=rtl]]:border-r-2 [&[dir=rtl]]:pl-0 [&[dir=rtl]]:pr-3"
              }
            >
              <span className="sr-only">{m.role === "user" ? "You: " : "AI twin: "}</span>
              <span className="whitespace-pre-wrap break-words">{m.text}</span>
            </li>
          ))}
        </ol>

        {pending && (
          <p role="status" className="flex items-center gap-3">
            <span aria-hidden="true" className="fit-spinner block size-4 shrink-0" />
            <span className="status-shimmer font-display text-body font-medium">Thinking</span>
          </p>
        )}
        {notice && (
          <p role="alert" className="border-l-2 border-amber pl-3 text-small text-phosphor">
            {notice}
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-phosphor/10 p-3">
        <label htmlFor="twin-input" className="sr-only">
          Your question
        </label>
        <textarea
          id="twin-input"
          ref={field}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          maxLength={MAX_CHARS}
          dir="auto"
          placeholder="Ask in English or Arabic"
          className="min-h-11 flex-1 resize-none rounded-box border border-phosphor/20 bg-night px-3 py-2 text-small text-phosphor placeholder:text-dim/70 focus:border-amber"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="h-11 rounded-box border border-phosphor/30 px-4 font-display text-small font-medium text-phosphor transition-colors duration-150 hover:border-amber hover:text-amber active:scale-[0.98] disabled:opacity-50"
        >
          Send
        </button>
      </form>
      {input.length > MAX_CHARS - 100 && (
        <p className="px-4 pb-2 text-right font-mono text-small text-dim">
          {input.length} / {MAX_CHARS}
        </p>
      )}
    </section>
  );
}
