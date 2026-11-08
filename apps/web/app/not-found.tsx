import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button-link";

export const metadata: Metadata = {
  title: "No objects found",
  robots: { index: false },
};

/* 404 in the detector's words. Polished further in W7. */
export default function NotFound() {
  return (
    <section className="mx-auto flex w-full max-w-site flex-1 flex-col justify-center px-4 py-24 md:px-8">
      <h1 className="font-display text-h2 font-extrabold text-phosphor md:text-h1">
        No objects found.
      </h1>
      <p className="mt-6 max-w-prose text-lead text-dim">
        The detector scanned this address and returned nothing. The page may have moved, or the
        link may be wrong.
      </p>
      <div className="mt-10">
        <ButtonLink href="/" variant="quiet">
          Back to the start
        </ButtonLink>
      </div>
    </section>
  );
}
