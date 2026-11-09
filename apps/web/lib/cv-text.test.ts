import { describe, expect, it } from "vitest";
import { resumeToText } from "./cv-text";
import { loadResume } from "./resume";

describe("resumeToText", () => {
  const text = resumeToText(loadResume());

  it("carries the verified facts, one per line", () => {
    expect(text.startsWith("Mohamed Ibrahim\nAI Engineer\n")).toBe(true);
    expect(text).toContain("EXPERIENCE");
    expect(text).toContain("AL Master IT Solutions");
    expect(text).toContain("PROJECTS");
    expect(text).toContain("Mizan:");
  });

  it("never leaks a TODO marker or the phone number", () => {
    expect(text).not.toContain("TODO(content)");
    expect(text).not.toMatch(/\+?20\d{9,}/);
  });

  it("is long enough for Mizan to screen", () => {
    expect(text.length).toBeGreaterThan(800);
  });
});
