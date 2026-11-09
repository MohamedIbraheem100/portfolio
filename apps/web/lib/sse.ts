/*
  Minimal Server-Sent Events reader over fetch(). The browser's EventSource only
  does GET; /api/fit (and later /api/chat) are POSTs. Same parser as Mizan's.
*/
export type SseEvent = { event: string; data: string };

export function parseSseChunk(buffer: string): { events: SseEvent[]; rest: string } {
  const events: SseEvent[] = [];
  const blocks = buffer.split("\n\n");
  const rest = blocks.pop() ?? ""; // incomplete trailing block: keep for the next chunk
  for (const block of blocks) {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    if (data.length) events.push({ event, data: data.join("\n") });
  }
  return { events, rest };
}

export async function readSse(
  response: Response,
  onEvent: (e: SseEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (!response.body) throw new Error("no response body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      if (signal?.aborted) break;
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      const parsed = parseSseChunk(buffer);
      buffer = parsed.rest;
      parsed.events.forEach(onEvent);
    }
    parseSseChunk(buffer + "\n\n").events.forEach(onEvent);
  } finally {
    reader.releaseLock();
  }
}
