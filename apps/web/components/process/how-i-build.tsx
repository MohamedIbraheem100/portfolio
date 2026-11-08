/*
  How I build: one diagram of the working loop instead of a skills logo wall
  (CLAUDE.md). Four stages, one line each. The lines restate the owner's own
  stated practice (architecture first, small components with explicit
  contracts, explicit assertions and measured results, production concerns
  shipped with the feature); wording awaits his approval (see PR).
*/
const STAGES = [
  {
    name: "Understand",
    line: "Read the architecture and the data before changing anything.",
  },
  {
    name: "Build",
    line: "Small components with explicit contracts, one path at a time.",
  },
  {
    name: "Evaluate",
    line: "Real inputs, explicit assertions, numbers before claims.",
  },
  {
    name: "Ship",
    line: "Rate limits, tests and logs go out with the feature, not after it.",
  },
] as const;

export function HowIBuild() {
  return (
    <section
      id="process"
      aria-labelledby="process-heading"
      className="mx-auto w-full max-w-site px-4 pt-20 md:px-8 md:pt-28"
    >
      <h2 id="process-heading" className="font-display text-h3 font-medium text-dim">
        How I build
      </h2>
      <ol className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-box bg-phosphor/10 md:grid-cols-4">
        {STAGES.map((s, i) => (
          <li key={s.name} className="relative bg-night p-6 md:p-7">
            <span aria-hidden="true" className="absolute left-0 top-6 h-6 w-0.5 bg-amber md:top-7" />
            <h3 className="font-display text-lead font-medium text-phosphor">
              {s.name}
              {i < STAGES.length - 1 && (
                <span aria-hidden="true" className="ml-2 text-dim">
                  &rarr;
                </span>
              )}
            </h3>
            <p className="mt-3 max-w-prose text-body text-dim">{s.line}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
