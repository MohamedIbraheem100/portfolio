"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { OPEN_CHAT_EVENT } from "@/components/chat/open-chat";
import { trackEvent } from "@/lib/analytics";

/*
  The AI twin's entry point (W2). It sits in the root layout, so the chat stays open
  and keeps its conversation while the visitor moves between pages and scrolls, the
  way a messenger does: they can ask something and check it against the page.

  Only this small button ships with every page. The panel (and its code) is fetched
  the first time it is opened.
*/
const ChatPanel = dynamic(() => import("@/components/chat/chat-panel").then((m) => m.ChatPanel), {
  ssr: false,
});

export function ChatLauncher() {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);

  useEffect(() => {
    const show = () => {
      setEverOpened(true);
      setOpen((wasOpen) => {
        if (!wasOpen) trackEvent("open_chat");
        return true;
      });
    };
    window.addEventListener(OPEN_CHAT_EVENT, show);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, show);
  }, []);

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_CHAT_EVENT))}
          className="fixed bottom-4 right-4 z-40 inline-flex h-12 items-center gap-2 rounded-box border border-phosphor/30 bg-night-raised px-4 font-display text-body font-medium leading-none text-phosphor shadow-[0_10px_30px_rgba(0,0,0,0.45)] transition-colors duration-150 hover:border-amber hover:text-amber active:scale-[0.98] md:bottom-6 md:right-6 print:hidden"
        >
          <span aria-hidden="true" className="block size-2 rounded-full bg-amber" />
          Chat with my AI twin
        </button>
      )}
      {/* Kept mounted once opened, so closing it does not lose what is being typed. */}
      {everOpened && <ChatPanel open={open} onClose={() => setOpen(false)} />}
    </>
  );
}
