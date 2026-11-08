import { site } from "@/lib/site";

/*
  W0 shell: the hero text block only. The 7-column right side is reserved for
  the point cloud portrait (W5); until W1 ships the static still, it stays empty
  rather than holding a placeholder.

  TODO(content): the one-sentence line under "AI Engineer." (what he builds,
  with the two strongest verified numbers). Added in W1 from resume.yaml.
*/
export default function Home() {
  return (
    <section className="mx-auto w-full max-w-site px-4 pb-24 pt-16 md:px-8 md:pt-28">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <h1 className="font-display text-hero font-extrabold text-phosphor">{site.name}</h1>
          <p className="mt-4 font-display text-h3 font-medium text-dim">{site.role}.</p>
        </div>
        <div className="md:col-span-7" aria-hidden="true" />
      </div>
    </section>
  );
}
