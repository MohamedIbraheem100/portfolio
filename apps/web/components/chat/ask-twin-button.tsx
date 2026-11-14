"use client";

import { openChat } from "@/components/chat/open-chat";

/* The hero's secondary action (D21): opens the floating chat. Styled as the text variant. */
export function AskTwinButton() {
  return (
    <button
      type="button"
      onClick={openChat}
      className="inline-flex items-center font-body text-body leading-none text-phosphor underline decoration-dim/60 underline-offset-4 transition-colors duration-150 hover:text-amber hover:decoration-amber"
    >
      Ask my AI twin
    </button>
  );
}
