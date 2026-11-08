import { cacheLife } from "next/cache";
import { Hero } from "@/components/hero/hero";
import { loadResume } from "@/lib/resume";

/*
  Home. W1 order (CLAUDE.md): Hero, Selected work, Experience, How I build, Contact.
  Sections are added one PR at a time as their content is verified; nothing is
  rendered from a TODO(content) value.
*/
export default async function Home() {
  "use cache";
  cacheLife("days");
  const resume = loadResume();
  return <Hero resume={resume} />;
}
