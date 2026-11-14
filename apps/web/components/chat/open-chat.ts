/*
  The chat lives in the layout (chat-launcher.tsx) so it follows the visitor across
  pages. Anything else on the site that wants to open it (the hero button) fires
  this event instead of holding a reference to it.
*/
export const OPEN_CHAT_EVENT = "twin:open";

export function openChat(): void {
  window.dispatchEvent(new Event(OPEN_CHAT_EVENT));
}
