"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  analyticsPathEnabled,
  googleTagManagerBootstrap,
  googleTagManagerId,
} from "@/lib/analytics";
export function GoogleTagManager({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const active = enabled && analyticsPathEnabled(pathname);
  useEffect(() => {
    if (!active) return;
    const w = window as Window & { dataLayer?: Record<string, unknown>[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event: "sukhan_page_view", page_path: pathname });
    // A full document navigation keeps a public-page GTM instance out of the studio.
    const privateBoundary = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element ? event.target.closest("a") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download"))
        return;
      const url = new URL(link.href, window.location.href);
      if (
        url.origin === window.location.origin &&
        !analyticsPathEnabled(url.pathname)
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.location.assign(url.href);
      }
    };
    document.addEventListener("click", privateBoundary, true);
    return () => document.removeEventListener("click", privateBoundary, true);
  }, [active, pathname]);
  if (!active) return null;
  return (
    <>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${googleTagManagerId}`}
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
          title="Google Tag Manager"
        />
      </noscript>
      <Script id="sukhan-google-tag-manager" strategy="afterInteractive">
        {googleTagManagerBootstrap}
      </Script>
    </>
  );
}
