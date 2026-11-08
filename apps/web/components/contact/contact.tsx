import { ContactForm } from "@/components/contact/contact-form";
import { CV_PDF_URL } from "@/lib/cv";
import { isTodo, type Resume } from "@/lib/resume";

/*
  Contact: email, LinkedIn, GitHub, Download CV on the left; the form on the
  right. The form posts to the API (see contact-form.tsx); the email link is
  always there as the no-JavaScript and no-quota fallback.
*/
const show = (v: string | undefined | null): v is string => Boolean(v) && !isTodo(v);

export function Contact({ resume }: { resume: Resume }) {
  const { basics } = resume;
  const email = show(basics.email) ? basics.email : null;
  const links = [
    email ? { label: email, href: `mailto:${email}` } : null,
    show(basics.links.linkedin) ? { label: "LinkedIn", href: basics.links.linkedin } : null,
    show(basics.links.github) ? { label: "GitHub", href: basics.links.github } : null,
    { label: "Download CV (PDF)", href: CV_PDF_URL },
  ].filter((l): l is { label: string; href: string } => Boolean(l));

  return (
    <section
      id="contact"
      aria-labelledby="contact-heading"
      className="mx-auto w-full max-w-site px-4 pb-24 pt-20 md:px-8 md:pb-32 md:pt-28"
    >
      <h2 id="contact-heading" className="font-display text-h3 font-medium text-dim">
        Contact
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-5">
          <p className="max-w-prose text-lead text-phosphor">
            For roles, collaborations or questions about any of the work above.
          </p>
          <ul className="mt-6 space-y-2">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="underline decoration-dim/50 underline-offset-4 hover:text-amber hover:decoration-amber"
                  target={l.href.startsWith("mailto:") ? undefined : "_blank"}
                  rel="noopener"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative md:col-span-7">
          <ContactForm fallbackEmail={email ?? ""} />
        </div>
      </div>
    </section>
  );
}
