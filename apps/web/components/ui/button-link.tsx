import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "quiet" | "text";

const base =
  "inline-flex items-center justify-center font-display font-medium text-body leading-none transition-colors duration-150";

/*
  primary: the one amber action in a view.
  quiet:   outlined box (the CV button in the header, secondary actions in panels).
  text:    underlined inline link.
*/
const variants: Record<Variant, string> = {
  primary:
    "h-12 px-5 rounded-box bg-amber text-night hover:bg-[#ffc14a] active:bg-[#e69e1a]",
  quiet:
    "h-10 px-4 rounded-box border border-phosphor/30 text-phosphor hover:border-amber hover:text-amber",
  text: "font-body underline decoration-dim/60 underline-offset-4 hover:decoration-amber hover:text-amber",
};

type Props = ComponentProps<typeof Link> & { variant?: Variant };

export function ButtonLink({ variant = "primary", className = "", ...props }: Props) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
