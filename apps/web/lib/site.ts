/*
  Site-wide facts. Anything about Mohamed that is not yet confirmed is left
  undefined and marked TODO(content); components render nothing for it.
*/
export const site = {
  name: "Mohamed Ibrahim",
  role: "AI Engineer",
  description:
    "Mohamed Ibrahim, AI Engineer working on agentic systems and applied computer vision. Portfolio with live demos that run in your browser.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://mohamedibrahim.is-a.dev",
  links: {
    github: "https://github.com/MohamedIbraheem100",
    linkedin: "https://www.linkedin.com/in/mohamed-ibrahim100",
    email: "mohamed.abdelwahed.ai@gmail.com",
  },
} as const;
