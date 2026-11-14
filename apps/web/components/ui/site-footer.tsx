import { cacheLife } from "next/cache";
import { site } from "@/lib/site";

/*
  Footer rule: name + year + links. Nothing names the host.
  Cached for a day: with Cache Components, `new Date()` is not allowed during
  prerender unless the result is explicitly cached or rendered on the client.
*/
export async function SiteFooter() {
  "use cache";
  cacheLife("days");
  const year = new Date().getFullYear();
  const links = [
    { label: "GitHub", href: site.links.github },
    { label: "LinkedIn", href: site.links.linkedin },
    { label: "Email", href: site.links.email ? `mailto:${site.links.email}` : undefined },
  ].filter((l): l is { label: string; href: string } => Boolean(l.href));

  return (
    <footer className="mt-auto w-full border-t border-phosphor/10 print:hidden">
      <div className="mx-auto flex max-w-site flex-col gap-3 px-4 py-8 text-small text-dim md:flex-row md:items-center md:justify-between md:px-8">
        <p>
          {site.name}, {year}
        </p>
        <ul className="flex gap-6">
          {links.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                className="underline decoration-dim/40 underline-offset-4 hover:text-amber hover:decoration-amber"
                rel="me noopener"
                target={l.href.startsWith("mailto:") ? undefined : "_blank"}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
