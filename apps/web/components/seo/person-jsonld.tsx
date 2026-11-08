import { site } from "@/lib/site";

/* schema.org Person: helps search engines connect a very common name to this site. */
export function PersonJsonLd() {
  const sameAs = [site.links.github, site.links.linkedin].filter(Boolean);
  const data = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.name,
    jobTitle: site.role,
    url: site.url,
    sameAs,
    knowsAbout: ["Computer Vision", "Agentic AI Systems", "Machine Learning Engineering"],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
