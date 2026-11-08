import type { NextConfig } from "next";

/*
  D4/D5: the FastAPI project is a separate Vercel deployment. The browser only
  ever talks to this origin; /api/* is proxied there, so no CORS and one
  domain. API_URL is set per environment (Vercel env var; .env locally).
*/
const API_URL = process.env.API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // The OG image reads a font file at request time; make sure it ships with the function.
  outputFileTracingIncludes: { "/opengraph-image": ["./lib/og/**"] },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/:path*` }];
  },
};

export default nextConfig;
