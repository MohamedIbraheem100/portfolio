import Link from "next/link";
import { site } from "@/lib/site";
import { ButtonLink } from "@/components/ui/button-link";

/*
  W0: name + CV. "Work" and "Lab" join the nav when those sections exist
  (W1 and W4), never before.
*/
export function SiteHeader() {
  return (
    <header className="w-full">
      <div className="mx-auto flex h-16 max-w-site items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          className="font-display text-body font-medium tracking-display text-phosphor hover:text-amber"
        >
          {site.name}
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-6">
          <ButtonLink href="/cv" variant="quiet">
            CV
          </ButtonLink>
        </nav>
      </div>
    </header>
  );
}
