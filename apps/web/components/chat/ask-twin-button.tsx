"use client";

import { openChat } from "@/components/chat/open-chat";

/*
  The hero's second action (D21, D37): opens the floating chat. Same height as the
  amber button beside it but outlined, so the eye still starts on the amber one;
  the green dot says the twin is live.
*/
export function AskTwinButton() {
  return (
    <button
      type="button"
      onClick={openChat}
      className="inline-flex h-12 items-center gap-2.5 rounded-box border border-phosphor/30 px-5 font-display text-body font-medium leading-none text-phosphor transition-colors duration-150 hover:border-amber hover:text-amber active:scale-[0.98]"
    >
      <span aria-hidden="true" className="twin-online block size-2 rounded-full" />
      Ask my AI twin
    </button>
  );
}
