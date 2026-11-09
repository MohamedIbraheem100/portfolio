import { describe, expect, it } from "vitest";
import { parseSseChunk } from "./sse";

describe("parseSseChunk", () => {
  it("parses complete blocks and keeps the incomplete tail", () => {
    const { events, rest } = parseSseChunk(
      'event: stage\ndata: {"stage":"rubric"}\n\nevent: progress\ndata: {"node":"judge"}\n\nevent: res',
    );
    expect(events).toEqual([
      { event: "stage", data: '{"stage":"rubric"}' },
      { event: "progress", data: '{"node":"judge"}' },
    ]);
    expect(rest).toBe("event: res");
  });

  it("joins multi-line data and defaults the event name", () => {
    const { events } = parseSseChunk("data: a\ndata: b\n\n");
    expect(events).toEqual([{ event: "message", data: "a\nb" }]);
  });
});
