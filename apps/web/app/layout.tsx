import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { arabic, body, display, mono } from "./fonts";
import { site } from "@/lib/site";
import { SiteHeader } from "@/components/ui/site-header";
import { SiteFooter } from "@/components/ui/site-footer";
import { PersonJsonLd } from "@/components/seo/person-jsonld";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { SiteField } from "@/components/motion/site-field";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name}, ${site.role}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_US",
    url: site.url,
    title: `${site.name}, ${site.role}`,
    description: site.description,
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0d1330",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable} ${arabic.variable} h-full`}
    >
      <body className="flex min-h-full flex-col text-phosphor">
        {/* Hero decision before first paint (W5): any WebGL device without reduced-motion skips the
            static still and gets the live point cloud (desktop: 40k + parallax, touch: 20k, later
            start). Reduced motion / no WebGL keep the still. Preloads the point file on the home page
            only. It mutates <html> before hydration, hence suppressHydrationWarning there. */}
        <Script id="hero-live" strategy="beforeInteractive">{`(function(){try{var m=window.matchMedia;if(m("(prefers-reduced-motion: reduce)").matches)return;var c=document.createElement("canvas");if(!(c.getContext("webgl2")||c.getContext("webgl")))return;var h=document.documentElement;var t=m("(pointer: coarse)").matches;h.classList.add("hero-live");h.setAttribute("data-hero-mode",t?"touch":"desktop");if(location.pathname!=="/")return;var l=document.createElement("link");l.rel="preload";l.as="fetch";l.href=t?"/portrait-20k.pcp3":"/portrait-40k.pcp3";l.crossOrigin="anonymous";document.head.appendChild(l);}catch(e){}})();`}</Script>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-amber focus:px-3 focus:py-2 focus:text-night print:hidden"
        >
          Skip to content
        </a>
        <SiteField />
        <SiteHeader />
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
        <SiteFooter />
        <PersonJsonLd />
        <SmoothScroll />
        <Analytics />
      </body>
    </html>
  );
}
