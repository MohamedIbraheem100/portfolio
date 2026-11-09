"use client";

import type { ComponentProps } from "react";
import { ButtonLink } from "@/components/ui/button-link";
import { trackEvent, type ProductEvent } from "@/lib/analytics";

/* A ButtonLink that records one of the six product events on click. */
export function TrackLink({
  event,
  onClick,
  ...props
}: ComponentProps<typeof ButtonLink> & { event: ProductEvent }) {
  return (
    <ButtonLink
      {...props}
      onClick={(e) => {
        trackEvent(event);
        onClick?.(e);
      }}
    />
  );
}
