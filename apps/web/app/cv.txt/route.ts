import { resumeToText } from "@/lib/cv-text";
import { loadResume } from "@/lib/resume";

/*
  GET /cv.txt: the CV as plain text, from resume.yaml. Recruiter Mode sends this
  exact text to Mizan, and visitors (or their tools) can read the same lines.
  Static: no request data is read, so it is prerendered at build.
*/
export async function GET() {
  return new Response(resumeToText(loadResume()), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
