# Decisions log

Settled before W0, point by point with the owner. Each entry: decision, why, consequence.
Folded into CLAUDE.md once the list is complete.

## D1. Repo is public
- Why: the repo itself is a work sample (CI, tests, shaders, prompt-injection tests).
- Consequence: nothing in git that cannot be public. Knowledge files are public by design.
  Fonts and media follow D2 and D3.

## D2. Fonts: OFL (Google Fonts), self-hosted, subsetted
- Replaces Cabinet Grotesk / Sentient (Fontshare ITF license forbids redistribution; public repo).
- Display: Bricolage Grotesque. Body: Newsreader. Telemetry: JetBrains Mono. Arabic: IBM Plex Sans Arabic.
- Fallback pair if the first does not look right on the W0 specimen page: Instrument Sans + Source Serif 4.
- Budget: 2 display weights, 2 body weights (regular + italic), 1 mono weight. Arabic loaded only when
  the AI Twin replies in Arabic. Target: all fonts under 120 KB woff2 on first load.
- Consequence: W0 ships a type specimen page so the pair is judged by eye before W1 content.

## D3. Large media lives outside git
- Videos, portrait.bin, ONNX models: Hugging Face (free dataset/model repos), fetched by URL.
- Why: repo stays light, Vercel build stays fast, no Git LFS quota games.

## D4. Two Vercel projects: web and api
- `apps/web` (Next.js) and `apps/api` (FastAPI) deploy as separate Vercel projects.
- Next.js rewrites `/api/*` to the API project, so visitors see one origin and no CORS is needed.
- Why: keeps the agreed layout, keeps Python deps out of the frontend build, lets Lighthouse and
  Playwright run on the web project alone.
- Mizan: live at https://mizan-hr.vercel.app, repo github.com/MohamedIbraheem100/mizan-hr.
  Portfolio API mirrors its deploy and LLM gateway pattern (verified against the repo, not assumed).

## D5. Recruiter Mode talks to Mizan server-to-server, with an internal key added to Mizan
- Real Mizan flow (verified in mizan-hr repo): POST /rubric (JD) -> POST /screenings (rubric) ->
  POST /screen (multipart CV file + screening_id, SSE events). `/fit` orchestrates these three.
- Mizan rate-limits per hashed IP; Vercel egress IPs are shared, so W3 adds `X-Internal-Key` to
  Mizan: bypasses per-visitor limit, counted on its own daily cap. Mizan keeps "never store CV files".
- Portfolio `/fit` streams Mizan's progress events through to the panel (same "watch it think" UX).
- Fallback when Mizan is down (503): panel shows a plain message + Download CV, never a fake score.
- Web -> API: Next.js rewrite `/api/*` first; if SSE buffers through the rewrite, switch to direct
  CORS calls with NEXT_PUBLIC_API_URL exactly like Mizan does.

## D6. Toolchain mirrors Mizan
- Web: npm, Node 22, Next 16 (App Router), React 19, Tailwind 4, TypeScript strict, vitest, eslint.
- API: Python 3.12, pip + requirements.txt / requirements-dev.txt, ruff (check + format), pytest.
- Vercel: `apps/api/api/index.py` ASGI entry, `vercel.json` maxDuration 300, same as Mizan.
- Why: the owner already knows this toolchain; zero new tooling to learn in W0.

## D7. Identity and domain
- Official spelling everywhere: **Mohamed Ibrahim** (site, CV, JSON-LD, domain). GitHub display
  name to be aligned by the owner (handle MohamedIbraheem100 stays; display name is what shows).
- Domain: `mohamedibrahim.is-a.dev` (checked free on 2026-11-07). Site ships on `.vercel.app` until
  approval; no code change when the domain lands. Paid `.dev` domain can replace it later the same way.
- Amended 2026-11-08: is-a.dev's PR template requires the site to be "reachable and completed" and
  rejects placeholder pages, so the register PR opens at the end of W1 (content-first site), not W0.
  The two JSON files (A record 216.198.79.1 + Vercel TXT verification) are ready on the fork branch
  `MohamedIbraheem100/register:mohamedibrahim`; the domain is already added to the Vercel web project.
- is-a.dev is acceptable on the CV.

## D8. Motion stack stays as planned (owner's call), with guardrails
- GSAP + ScrollTrigger, Lenis, motion. Owner wants the feel of smooth scroll; we keep it.
- Guardrails: Lenis off under `prefers-reduced-motion`; native scroll on touch devices; lerp ~0.1
  (no "ice rink"); anchor links, find-in-page and scroll restoration keep working.
- GSAP and Lenis are loaded only after first paint (not in the LCP path); Lighthouse CI guards the budget.

## D9. Point cloud prototype on W1 day 1, isolated
- One standalone HTML file with the real photo + Depth Anything V2 map, three densities, judged by eye.
- If the inferno-colored face does not convince, the art direction changes before anything is built
  around it. Needs the photo from the owner at the start of W1.

## D10. Endpoint protection: invisible layers, no CAPTCHA
- Per-IP daily limit + global daily cap (Mizan's ratelimit pattern, Upstash).
- Origin/Referer check on `/chat`, `/fit`, `/contact`.
- Short-lived HMAC-signed session token issued by the page, required on every API call.
- Turnstile is NOT in scope; added only if logs show real abuse.
- Threat model: automated scanners looking for free LLM proxies, not humans with VPNs.

## D11. Recruiter Mode stores hash + result only
- Cache key = SHA-256(normalized JD). Value = fit result. JD text is never persisted (passes to
  Mizan and is gone). Panel copy: "Your JD is processed and not stored."

## D12. Fit result is evidence-first
- Order: met must-haves with the quoted CV line -> honest gaps -> score as the closing summary.
- Why: a lone percentage invites a one-second verdict; evidence invites reading.

## D13. Knowledge base is written in the owner's voice
- ChatGPT produces only an outline and question list. The owner answers in writing or voice notes;
  Claude transcribes, structures into `knowledge/*.md`, and checks every number against `resume.yaml`.
- `voice.md` contains only text the owner actually wrote.

## D14. CV PDF is built in CI and published as a GitHub Release asset
- On change to `resume.yaml` or `/cv`: Playwright prints `/cv` to PDF, uploads to a rolling release
  (`cv-latest`). Stable URL; no bot commits in history. Download CV button points at it.

## D15. No stat row; numbers live inside project scenes
- Each verified number appears as a sentence inside its project's scene. The hero sentence carries
  the two strongest numbers. No "Proof" strip of four big figures.

## D16. Cashy demo is camera-first (owner's call), with mitigations
- Camera opens first. Mitigations: framing guide overlay, curated sample images visible right next
  to the camera, and a "Not confident" state below a confidence threshold instead of a wrong label.

## D17. CV button in the header on every page; W1 is designed mobile-first
- The mobile hero is the first thing judged in W1, not the last.

## D18. SEO basics from W0
- Next metadata API, sitemap.xml, robots.txt, Person JSON-LD, OG image per page.

## D19. CI strategy for LLM behaviour
- Every PR: gateway and prompt-injection tests against a mocked provider (fast, deterministic).
- Live eval against real providers: manual `workflow_dispatch`, run before each milestone ships.

## D20. Lab isolation and telemetry
- COOP/COEP headers only on `/lab` (multi-threaded WASM), never site-wide.
- Six analytics events only: open_chat, send_message, run_fit, run_lab, download_cv, click_email.
- Housekeeping before first commit: default branch `main`; root `venv` removed (API has its own
  under apps/api); `.gitignore` and `.env.example` written properly.

## D21. Hero CTA hierarchy
- Primary (amber button): "Screen my CV against your role". Secondary (underlined text link): "Ask my AI twin".
- Why: one action color means one primary action; Recruiter Mode is the differentiator and leads to Mizan.

## D22. Portrait photo
- v1 (2026-11-07): 960x1280 indoor photo, flat frontal light, WhatsApp-compressed. Used for the W1 day-1
  prototype only (head-and-shoulders crop, rembg, Depth Anything V2). Stored locally in `assets-src/`
  (git-ignored); only the derived `portrait.bin` and renders are published (Hugging Face, D3).
- v2 to be shot during W1: 2000px+, plain wall, window side light, plain dark top, no portrait mode,
  sent as an original file. Same pipeline, file swap only.

## D23. Original brief kept in the repo
- `docs/brief.md` = the original design brief without the company byline. Shows the design thinking.

## D24. Public contact email
- A personal professional address (not a company one): `mohamed.abdelwahed.ai@gmail.com` (settled 2026-11-08).

## D25. Lighthouse CI runs against a local production build in GitHub Actions
- `next build` + `next start` inside the workflow; no dependency on Vercel preview timing.
- Vercel projects (renamed 2026-11-08, `mohamedibrahim` was taken): `mohamedibrahim-ai` (web, root
  apps/web) and `mohamedibrahim-ai-api` (api, root apps/api, framework Other). Production URLs:
  https://mohamedibrahim-ai.vercel.app and https://mohamedibrahim-ai-api.vercel.app.
- Lesson: renaming a Vercel project does not change its `.vercel.app` domain; add the new domain under
  Settings > Domains. `DEPLOYMENT_NOT_FOUND` on a `.vercel.app` host means the name is unassigned.
