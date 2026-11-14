"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { TwinOrb } from "@/components/chat/twin-orb";
import { trackEvent } from "@/lib/analytics";
import { readSse } from "@/lib/sse";

/*
  The AI twin's chat (W2, D36/D37). A floating panel, not a page: it stays beside the
  content so a visitor can ask and verify. On a phone it is a sheet over the lower
  part of the screen; the page above it still scrolls.

  The conversation lives in sessionStorage: it survives page changes and a reload,
  and it is gone when the tab closes. Nothing is stored on the server.

  /api/chat returns one whole answer that the API has already checked. The panel
  then writes it out word by word, which reads better than a block landing at once.
  While waiting, the point sphere in the header turns faster and warms to amber and
  three dots pulse in the thread; no clock anywhere (D32).
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
// Offered two at a time after an answer, skipping what was already asked.
const FOLLOW_UPS = [
  ...STARTERS,
  "What is your tech stack?",
  "What was the hardest problem you solved?",
  "What did you do at H.Hunters?",
  "How do you work with AI coding assistants?",
];
const WORD_MS = 26;

const isArabic = (text: string) => /[؀-ۿ]/.test(text);
const nowSeconds = () => Date.now() / 1000;
const CORNER = "pointer-events-none absolute size-2 border-amber";

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

/* Writes an answer out word by word. Under reduced motion it is shown at once. */
function Typed({ text, onProgress, onDone }: { text: string; onProgress: () => void; onDone: () => void }) {
  const words = useMemo(() => text.split(/(\s+)/), [text]);
  const [shown, setShown] = useState(0);
  const done = shown >= words.length;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = window.setTimeout(() => setShown(words.length), 0);
      return () => window.clearTimeout(id);
    }
    const id = window.setInterval(() => setShown((n) => n + 2), WORD_MS); // a word and its space
    return () => window.clearInterval(id);
  }, [words]);
  useEffect(() => {
    onProgress();
    if (done) onDone();
  }, [shown, done, onProgress, onDone]);

  return <>{done ? text : words.slice(0, shown).join("")}</>;
}

export function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Client-only component (loaded with ssr: false), so reading storage here is safe.
  const [messages, setMessages] = useState<Message[]>(loadConversation);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [typing, setTyping] = useState(false); // the newest answer is still being written out
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

  const toBottom = useCallback(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);
  const typingDone = useCallback(() => setTyping(false), []);
  useEffect(() => {
    toBottom();
  }, [toBottom, messages, pending, typing, open]);
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
    if (field.current) field.current.style.height = "";
    setNotice(null);
    setTyping(false);
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
          setTyping(true);
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
  function onInput(value: string) {
    setInput(value);
    const el = field.current;
    if (el) {
      el.style.height = "auto"; // grow with the text, up to four lines
      el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
    }
  }
  function clear() {
    abort.current?.abort();
    setMessages([]);
    setNotice(null);
    setPending(false);
    setTyping(false);
  }

  if (!open) return null;

  const asked = new Set(messages.filter((m) => m.role === "user").map((m) => m.text));
  const last = messages[messages.length - 1];
  const followUps =
    last?.role === "assistant" && !pending && !typing ? FOLLOW_UPS.filter((q) => !asked.has(q)).slice(0, 2) : [];
  const canSend = Boolean(input.trim()) && !pending;

  return (
    <section
      role="dialog"
      aria-label="Chat with Mohamed's AI twin"
      className="twin-panel fixed inset-x-0 bottom-0 z-50 flex h-[76dvh] flex-col overflow-hidden rounded-t-[1.25rem] border border-phosphor/15 bg-night-raised bg-[radial-gradient(120%_55%_at_50%_0%,rgba(52,66,138,0.5),rgba(22,29,69,0)_70%)] shadow-[0_24px_70px_rgba(0,0,0,0.6),0_0_40px_rgba(255,176,31,0.07)] md:inset-x-auto md:bottom-8 md:right-8 md:h-[36rem] md:max-h-[calc(100dvh-4rem)] md:w-[25rem] md:rounded-[1.25rem] print:hidden"
    >
      <header className="flex items-center gap-3 border-b border-phosphor/10 px-4 py-3">
        <span className="relative flex size-11 shrink-0 items-center justify-center">
          <TwinOrb size={38} active={pending} />
          <span aria-hidden="true" className={`${CORNER} left-0 top-0 border-l border-t`} />
          <span aria-hidden="true" className={`${CORNER} right-0 top-0 border-r border-t`} />
          <span aria-hidden="true" className={`${CORNER} bottom-0 left-0 border-b border-l`} />
          <span aria-hidden="true" className={`${CORNER} bottom-0 right-0 border-b border-r`} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-body font-medium leading-tight text-phosphor">Mohamed&rsquo;s AI twin</p>
          <p className="mt-1 flex items-center gap-2 text-small leading-none text-dim">
            <span aria-hidden="true" className="twin-online block size-2 rounded-full" />
            <span role="status">{pending ? "Thinking" : "Online"}</span>
          </p>
        </div>
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
          className="flex size-9 shrink-0 items-center justify-center rounded-full text-dim transition-colors hover:bg-phosphor/10 hover:text-phosphor"
        >
          <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>
      </header>

      <div ref={scroller} data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <p className="text-small text-dim">
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

        {messages.length === 0 && !pending && (
          <ul className="mt-4 space-y-2">
            {STARTERS.map((q, i) => (
              <li key={q} className="twin-message" style={{ animationDelay: `${i * 60}ms` }}>
                <button
                  type="button"
                  onClick={() => void send(q)}
                  className="w-full rounded-[0.9rem] border border-phosphor/15 bg-night/40 px-3.5 py-2.5 text-left text-small text-phosphor transition-colors duration-150 hover:border-amber hover:bg-night/70"
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        )}

        <ol aria-live="polite" aria-label="Conversation" className="mt-4 flex flex-col gap-3">
          {messages.map((m, i) => (
            <li
              key={i}
              lang={m.lang}
              dir={m.lang === "ar" ? "rtl" : "ltr"}
              className={`twin-message max-w-[88%] px-3.5 py-2.5 text-small leading-relaxed text-phosphor ${
                m.role === "user"
                  ? "self-end rounded-[1rem] rounded-br-[0.25rem] bg-phosphor/[0.12]"
                  : "self-start rounded-[1rem] rounded-bl-[0.25rem] border border-phosphor/10 bg-night/70"
              }`}
            >
              <span className="sr-only">{m.role === "user" ? "You: " : "AI twin: "}</span>
              <span className="whitespace-pre-wrap break-words">
                {m.role === "assistant" && typing && i === messages.length - 1 ? (
                  <Typed text={m.text} onProgress={toBottom} onDone={typingDone} />
                ) : (
                  m.text
                )}
              </span>
            </li>
          ))}
        </ol>

        {pending && (
          <p className="twin-message twin-dots mt-3 inline-flex items-center gap-1.5 self-start rounded-[1rem] rounded-bl-[0.25rem] border border-phosphor/10 bg-night/70 px-4 py-3.5">
            <span className="block size-1.5 rounded-full bg-amber" />
            <span className="block size-1.5 rounded-full bg-amber" />
            <span className="block size-1.5 rounded-full bg-amber" />
            <span className="sr-only">Thinking</span>
          </p>
        )}

        {followUps.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label="Suggested questions">
            {followUps.map((q) => (
              <li key={q} className="twin-message">
                <button
                  type="button"
                  onClick={() => void send(q)}
                  className="rounded-full border border-phosphor/20 px-3 py-1.5 text-left text-small text-dim transition-colors duration-150 hover:border-amber hover:text-phosphor"
                >
                  {q}
                </button>
              </li>
            ))}
          </ul>
        )}

        {notice && (
          <p role="alert" className="twin-message mt-4 rounded-[0.9rem] border border-amber/40 px-3.5 py-2.5 text-small text-phosphor">
            {notice}
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-phosphor/10 p-3">
        <div className="flex items-end gap-2 rounded-[1.4rem] border border-phosphor/20 bg-night/70 py-1.5 pl-4 pr-1.5 transition-colors focus-within:border-amber">
          <label htmlFor="twin-input" className="sr-only">
            Your question
          </label>
          <textarea
            id="twin-input"
            ref={field}
            value={input}
            onChange={(e) => onInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={MAX_CHARS}
            dir="auto"
            placeholder="Ask in English or Arabic"
            className="max-h-28 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-small text-phosphor outline-none placeholder:text-dim/70 focus-visible:outline-none"
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send"
            className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-150 active:scale-95 ${
              canSend ? "bg-amber text-night hover:bg-[#ffc14a]" : "bg-phosphor/10 text-dim"
            }`}
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
            </svg>
          </button>
        </div>
        {input.length > MAX_CHARS - 100 && (
          <p className="mt-1 px-2 text-right font-mono text-small text-dim">
            {input.length} / {MAX_CHARS}
          </p>
        )}
      </form>
    </section>
  );
}
