import localFont from "next/font/local";

/*
  All fonts are OFL, instanced to static weights and subsetted to Latin
  (Arabic for the chat font) by the owner's offline pipeline. First-load
  fonts (display + body) are ~86 KB woff2 in total. Mono and Arabic are
  declared here so their CSS variables exist, but are not preloaded: the
  browser fetches them only when something on the page uses them.
*/

export const display = localFont({
  src: [
    { path: "./fonts/bricolage-800.woff2", weight: "800", style: "normal" },
    { path: "./fonts/bricolage-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
});

export const body = localFont({
  src: [
    { path: "./fonts/newsreader-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/newsreader-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-body",
  display: "swap",
});

export const mono = localFont({
  src: "./fonts/jetbrains-mono-400.woff2",
  weight: "400",
  variable: "--font-mono",
  display: "swap",
  preload: false,
});

export const arabic = localFont({
  src: "./fonts/ibm-plex-arabic-400.woff2",
  weight: "400",
  variable: "--font-arabic",
  display: "swap",
  preload: false,
});
