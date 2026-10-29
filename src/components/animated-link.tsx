"use client";

import NextLink, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

function LoadingIndicator() {
  const { pending } = useLinkStatus();

  return (
    <span
      className={`sukhan-link-loader${pending ? " is-loading" : ""}`}
      aria-hidden="true"
    />
  );
}

export default function AnimatedLink({
  children,
  ...props
}: ComponentProps<typeof NextLink>) {
  return (
    <NextLink {...props}>
      {children}
      <LoadingIndicator />
    </NextLink>
  );
}
