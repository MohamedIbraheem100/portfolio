import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { RecruiterPanel } from "@/components/recruiter/recruiter-panel";
import { isTodo, loadResume } from "@/lib/resume";

export const metadata: Metadata = {
  title: "Screen my CV against your role",
  description:
    "Paste a job description and see an evidence-based fit report for Mohamed Ibrahim's CV: what is met with the quoted line, the gaps, then the score. Powered by Mizan.",
};

/*
  Recruiter Mode (W3). The page is static; the panel talks to /api/fit.
*/
export default async function FitPage() {
  "use cache";
  cacheLife("days");
  const { basics } = loadResume();
  const email = isTodo(basics.email) ? null : basics.email;
  return (
    <section className="mx-auto w-full max-w-site px-4 pb-24 pt-10 md:px-8 md:pb-32 md:pt-16">
      <h1 className="max-w-[18ch] font-display text-h2 font-extrabold text-phosphor md:text-h1">
        Screen my CV against your role
      </h1>
      <p className="mt-6 max-w-prose text-lead text-dim">
        Paste a job description. Mizan, the CV screening tool I built, reads my CV against it and shows
        what it finds: evidence first, gaps included, score last.
      </p>
      <div className="mt-12">
        <RecruiterPanel email={email} />
      </div>
    </section>
  );
}
