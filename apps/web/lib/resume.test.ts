import { describe, expect, it } from "vitest";
import { assertConsistent, isTodo, loadResume, parseResume, pendingContent } from "./resume";

describe("resume.yaml", () => {
  const resume = loadResume();

  it("validates against the schema", () => {
    expect(resume.basics.name).toBe("Mohamed Ibrahim");
    expect(resume.projects.length).toBeGreaterThan(0);
  });

  it("has unique project slugs and highlights point at real projects", () => {
    expect(() => assertConsistent(resume)).not.toThrow();
  });

  it("never carries a bare percentage without context", () => {
    for (const h of resume.highlights) {
      if (isTodo(h.value)) continue;
      expect(h.context.length, `highlight ${h.value} needs context`).toBeGreaterThan(10);
    }
  });

  it("never hides a TODO marker inside a real sentence", () => {
    // isTodo() only recognises markers at the start of a value; a marker in the
    // middle of a sentence would reach visitors as text.
    const walk = (v: unknown, path: string): string[] => {
      if (typeof v === "string") return v.includes("TODO(content)") && !isTodo(v) ? [path] : [];
      if (Array.isArray(v)) return v.flatMap((x, i) => walk(x, `${path}[${i}]`));
      if (v && typeof v === "object")
        return Object.entries(v).flatMap(([k, x]) => walk(x, path ? `${path}.${k}` : k));
      return [];
    };
    expect(walk(resume, "")).toEqual([]);
  });

  it("lists pending content so nothing invented slips through", () => {
    const pending = pendingContent(resume);
    expect(Array.isArray(pending)).toBe(true);
    for (const path of pending) expect(path).not.toBe("");
  });
});

describe("parseResume", () => {
  it("rejects an unknown demo type", () => {
    const bad = `
basics: {name: A, role: B, headline: c, location: d, email: e, links: {}, availability: f}
highlights: []
experience: [{company: X, title: Y, start: "2020", end: null, location: Z, impact: [one]}]
projects: [{slug: p, name: P, one_liner: o, role: r, stack: [s], results: [x], what_failed: w, links: {}, demo: hologram}]
education: []
skills: []
languages: []
`;
    expect(() => parseResume(bad)).toThrow();
  });
});
