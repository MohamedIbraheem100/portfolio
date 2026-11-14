"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { OPEN_CHAT_EVENT, openChat } from "@/components/chat/open-chat";
import { TwinOrb } from "@/components/chat/twin-orb";
import { trackEvent } from "@/lib/analytics";

/*
  The AI twin's entry point (W2, D36/D37). It sits in the root layout, so the chat
  stays open and keeps its conversation while the visitor moves between pages and
  scrolls, the way a messenger does: they can ask something and check it against
  the page.

  Only this launcher ships with every page: the turning point sphere inside the
  detector's brackets, a light that travels around its edge, and the green "online"
  dot. Once per visit a short line rises above it to say what it is for. The panel
  (and its code) is fetched the first time it is opened.
*/
const ChatPanel = dynamic(() => import("@/components/chat/chat-panel").then((m) => m.ChatPanel), {
  ssr: false,
});

const TEASER_KEY = "twin:teaser";
const TEASER_AFTER_MS = 4000;
const TEASER_FOR_MS = 9000;

const CORNER = "pointer-events-none absolute size-2 border-amber";

export function ChatLauncher() {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [teaser, setTeaser] = useState(false);

  useEffect(() => {
    const show = () => {
      setEverOpened(true);
      setTeaser(false);
      setOpen((wasOpen) => {
        if (!wasOpen) trackEvent("open_chat");
        return true;
      });
    };
    window.addEventListener(OPEN_CHAT_EVENT, show);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, show);
  }, []);

  // The one-time hint. Storage may be blocked (private mode): then it simply shows again.
  useEffect(() => {
    let hide = 0;
    const appear = window.setTimeout(() => {
      try {
        if (window.sessionStorage.getItem(TEASER_KEY)) return;
        window.sessionStorage.setItem(TEASER_KEY, "1");
      } catch {
        /* show it anyway */
      }
      setTeaser(true);
      hide = window.setTimeout(() => setTeaser(false), TEASER_FOR_MS);
    }, TEASER_AFTER_MS);
    return () => {
      window.clearTimeout(appear);
      window.clearTimeout(hide);
    };
  }, []);

  return (
    <>
      {!open && (
        <div className="fixed bottom-5 right-4 z-40 flex flex-col items-end gap-3 md:bottom-8 md:right-8 print:hidden">
          {teaser && (
            <button
              type="button"
              onClick={openChat}
              className="twin-teaser rounded-[0.9rem] rounded-br-[0.2rem] border border-phosphor/15 bg-night-raised px-3.5 py-2 text-small text-phosphor shadow-[0_10px_30px_rgba(0,0,0,0.45)] hover:border-amber"
            >
              <span className="md:hidden">Ask me anything</span>
              <span className="hidden md:inline">Ask me anything about Mohamed&rsquo;s work</span>
            </button>
          )}
          <button
            type="button"
            onClick={openChat}
            className="twin-launcher twin-edge relative inline-flex h-14 items-center gap-3 rounded-full border border-phosphor/15 bg-night-raised pl-2 pr-5 font-display text-body font-medium leading-none text-phosphor"
          >
            <span className="relative flex size-10 items-center justify-center">
              <TwinOrb size={34} />
              <span aria-hidden="true" className={`${CORNER} left-0 top-0 border-l border-t`} />
              <span aria-hidden="true" className={`${CORNER} right-0 top-0 border-r border-t`} />
              <span aria-hidden="true" className={`${CORNER} bottom-0 left-0 border-b border-l`} />
              <span aria-hidden="true" className={`${CORNER} bottom-0 right-0 border-b border-r`} />
            </span>
            Chat with my AI twin
            <span aria-hidden="true" className="twin-online block size-2 rounded-full" />
          </button>
        </div>
      )}
      {/* Kept mounted once opened, so closing it does not lose what is being typed. */}
      {everOpened && <ChatPanel open={open} onClose={() => setOpen(false)} />}
    </>
  );
}
