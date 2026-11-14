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

## D26. Point cloud art direction: mono phosphor, amber as the only accent (settled 2026-11-08)
- Outcome of the D9 prototype with the real photo. Full inferno by depth reads as a thermal camera and
  flattens the face (the whole face sits at one depth relative to the shoulders). Owner rejected it.
- Chosen: points in `phosphor` on `night`; brightness = photo luminance (gamma 0.7, capped at 0.92)
  times nearness; point size follows luminance (halftone); jittered-grid sampling; head-and-shoulders
  crop (chest ratio 1.55). The amber bounding box stays the only accent in the hero.
- Alternatives kept in the prototype for reference: ember (restrained inferno), duotone, photo.
- The inferno ramp remains reserved for real model outputs (Lab heatmaps, detections), per the token rules.
- Numbers from the prototype: 40k points, 1.6 s assemble, 45 to 144 fps on an integrated AMD GPU
  depending on point size; point size vs density is tuned in W5.

## D27. Point data ships from public/ as compact PCP3 files (amends D3 for the portrait)
- `tools/pack_points.py` packs PCP2 into 6 bytes per point (int16 x,y + depth byte + luma byte):
  40k points = 234 KB, 20k = 117 KB. Small enough to live in `apps/web/public/` and be cached by
  Vercel's CDN; no Hugging Face hop for the hero. Videos and ONNX models still follow D3.
- The live hero (W5) loads the 40k file on fine pointers and the 20k file on coarse ones, after
  the page is idle; the static still stays the LCP element and the fallback.
- Telemetry in the detection box is measured (point count, assemble ms, fps). No confidence value
  is shown because no detector ran; motion rule 1's "confidence" is satisfied with real numbers only.

## D28. Hero background: live neural field (owner's call, 2026-11-08)
- The owner found the flat night hero dull and asked for a dynamic, AI-related background. Added
  `components/hero/neural-field.tsx`: sparse nodes joined by faint phosphor threads (alpha <= 0.16),
  drifting slowly, rare signal pulses along threads, nodes near the cursor light amber and link to it.
  Hero section only. Reduced motion: one static frame. Pauses off-screen and in hidden tabs.
- This is a deliberate exception to motion rule 3 (ambient motion) limited to the hero background;
  it stays far below the content in contrast so the portrait and the text keep the attention.
- Also: a soft radial lift (night-raised) behind the portrait.

## D29. Hero goes live on every WebGL device; text first on mobile (amends D17 and the W5 plan)
- Owner: a static still on phones is not acceptable. Touch devices now run the cloud with 20k points,
  no parallax, starting on the first touch/scroll or 2.2 s after load (keeps the mobile load metrics
  clean). Desktop starts immediately. Only reduced motion / no WebGL keep the still.
- Mobile order is now name, role, headline, CTAs, then the portrait (the cloud appears a moment
  later, below the fold of the first read).
- The cursor-drift effect (points pulled toward the cursor) was removed: it deformed the face.

## D30. Motion system and order of work (2026-11-09)
- W5b shipped: the neural field is a fixed page-wide layer; project visuals get detector brackets on
  scroll; the Experience rule fills with scroll; How I build carries a signal; buttons and nav have
  micro-interactions. CLAUDE.md "Motion rules" was rewritten to match (two languages: detector, data pulse).
- Order from here: W3 Recruiter Mode first (no content gate, Mizan is live), then W2 AI Twin (gated on the
  owner's interview answers), then W4. Visual work is frozen until content catches up, except what a new
  feature needs (chat panel, fit panel, lab UI).
- Domain: is-a-dev/register#60489 merged 2026-11-09. DNS (A + TXT) is live; Vercel still has to verify the
  domain and issue the certificate (owner: Settings > Domains > Refresh). `ALLOWED_ORIGINS` on the API
  must include `https://mohamedibrahim.is-a.dev` or the contact form is refused from the new domain.

## D31. Recruiter Mode as shipped (W3, 2026-11-09)
- `/fit` is a page, not a modal: deep-linkable, static, and the hero's one amber action leads to it.
- The CV sent to Mizan is `/cv.txt`, plain text rendered from `resume.yaml` (one fact per line), not
  the PDF: quotes are exact lines a visitor can read, and there is no PDF text-layer risk.
- Blind mode is off for these screenings: it is the owner's own public CV, and redaction put
  "[REDACTED]" inside the quoted evidence.
- The two example job descriptions are deliberately not tuned to the CV; each asks for things it lacks.
- Mizan change: `X-Internal-Key` on `/screen` (mizan-hr#12) counts portfolio traffic on its own daily
  cap. `MIZAN_INTERNAL_KEY` here must equal `INTERNAL_KEY` there.
- Measured on production: 8 s for a fresh job description, about 1 s from the 24 h cache.
- CI gained Playwright smoke tests (`apps/web/e2e`), run against the production build with `/api/*`
  intercepted; three of the six product events are wired (run_fit, download_cv, click_email).
- Finding from the first real runs: the CV never says "Python", so Mizan reports it as "no evidence".
  That is a content gap for the owner to confirm and fix in `resume.yaml`, not a bug.

## D32. Recruiter Mode narrates the wait (2026-11-09)
- A screening takes 10 to 25 s. The panel lists the whole pipeline from the first second (rubric,
  opening a screening, then Mizan's parse, extract, judge, verify, score, explain): a spinner on the
  running step, a check on each finished one, and one line under the running step saying what it
  really does (LLM or plain code). The status line shimmers with the current step.
- No clocks, timers or durations anywhere in the panel or the report (owner's call: the wait must not
  be advertised to a recruiter). After 25 s one line says it is still working. The steps moving are
  the progress indicator.
- The rubric's requirements are sent in the `rubric done` event and shown at once as the skeleton of
  the report ("checking"), so there is real content on screen long before the verdicts.
- The API announces "opening a screening" before fetching the CV and creating the screening; that
  gap used to be 3 s of silence.
- `GET /fit/warm` (origin-checked, capped) is called on the first touch of the form and wakes both
  serverless functions with one health call.
- The stream is sent with `Cache-Control: no-cache, no-transform`. Without `no-transform` the Next.js
  rewrite gzips and buffers it: measured locally, every event arrived together at the end.
- A Stop button aborts the request in the browser. An answer from the 24 h cache says so and shows
  no checklist, because nothing was run.

## D33. The CV is one document for screen and paper (2026-11-14)
- The PDF visitors download was broken: a print rule on `header[class]` hid the CV's own name and
  contact line, the dark color scheme painted the page margins near-black, and the two-column grid
  ran to four pages. The owner asked to serve his hand-made 2025 PDF instead; that file is out of
  date (wrong current employer, no Mizan) and carries his phone number, so it is not used.
- `/cv` is now one column in reading order (name, contact, Profile, Experience, Education, Projects,
  Skills, Certificates, Languages), the layout of his original. On screen it is a page of the site;
  printed it is black on white, two A4 pages, real text, standard section names, no tables, icons or
  columns, so an ATS reads it. D14 stands: CI prints it and publishes the release asset.
- Work done for an employer is told once, under Experience: projects marked `demo: case-study` are
  not repeated in the CV's Projects section. `/cv.txt` (what Mizan screens) is unchanged.
- Site chrome hides itself in print with `print:hidden`; a smoke test prints the page in the browser
  and checks that the name and email are visible and the chrome is not.
- Content added the same day from the owner's answers: H.Hunters impact lines (drafted from his own
  work sessions, his AI work only; wording and numbers await his confirmation), English B2, "Python"
  in the skills, and `basics.profile`, a Profile paragraph for the CV that is separate from the hero
  headline.
- Phone number: the repo, the site and the published PDF are public, so the number stays out of all
  three. `CV_PHONE=... node scripts/print-cv.mjs` prints a private copy with the number for sending
  to an employer directly; it lives only in the git-ignored `assets-src/`.

## D34. The AI twin's knowledge base, first version (W2, 2026-11-14)
- `apps/api/knowledge/` holds the eight files of CLAUDE.md, written in the first person from the
  owner's interview of 2026-11-14, `resume.yaml`, and Mizan's own decision records. The ChatGPT
  outline was used only to decide what to ask; nothing unconfirmed from it went in (the call-centre
  job and the "freelance" line are left out until he confirms them).
- Team projects say "team" and state his part (Cashy: model training and the link to the Flutter
  app; SpotLight: scene understanding, the Gradio UI, fitting the models on two T4 GPUs). Teammates
  are never named, in the knowledge base or anywhere in the public repo.
- `voice.md` is about writing style, not audio. It carries a few sentences he actually wrote and
  short example replies; the twin answers in text.
- `faq.md` ends with "Not in the knowledge base yet": the questions the twin must hand to Mohamed
  instead of guessing (notice period, salary, visa status, how the 30% at AL Master was measured).
- AL Master was an internship done by his NTI team of five. The title is now the one on his
  certificate, "AI Engineer Intern", and the lines describe his part (backend, infrastructure,
  Redis caching and rate limiting). A CV title must survive a reference check.
- One number was corrected against the source: Mizan's batch of 10 CVs went from 220 s to about
  90 s (ADR-0003 in the Mizan repo), not 70 s.
- `tests/test_knowledge.py` runs in CI before any model reads the files: all eight exist, no
  placeholder or outline marker, no phone number, no emoji, and every percentage is also in
  `resume.yaml`.
- `resume.yaml` gained the same facts (availability, team sizes, his part, what failed in Mizan,
  the booking path that calls the CRM); the CV still prints to two pages.

## D35. The AI twin's API: model ladder, checked answers (W2, 2026-11-14)
- Measured with the owner's keys: each Groq model allows 8,000 tokens a minute and 1,000 requests a
  day, and the knowledge base costs about 4,900 tokens per message, so Groq alone gives about three
  messages a minute. A Gemini key from a new Google project works on the free tier:
  `gemini-3.5-flash-lite` answers in 1 to 2 s with the whole knowledge base and took six messages in
  a row without a refusal. `gemini-3.5-flash` thinks for 8 to 18 s and is not used.
- So the design stays long context (CLAUDE.md), with a ladder: Gemini Flash-Lite, then Groq Qwen
  (best Egyptian Arabic), gpt-oss-120b, gpt-oss-20b. A model that answers 429 or breaks is skipped
  for its retry-after. A paid OpenAI model can be appended as the last step by setting its key; no
  code change. The compact-prompt idea proposed earlier the same day was dropped once Gemini worked.
- When every model is out, the visitor gets a plain "busy" reply with the CV and the email: never an
  error, never a hang.
- Answers are not streamed token by token. The whole answer is produced (about a second), cleaned
  and checked in code, and only then sent: any number, email or link that is not in the knowledge
  base, a phone number, or a piece of the prompt replaces the answer with "I'd rather Mohamed
  answer that himself". The model is instructed to stay grounded; this check does not rely on it.
- The visitor's text travels only in the user role. History comes from the browser, so it is
  trimmed to six turns and to user/assistant roles.
- Nothing is stored or logged: not the question, not the answer.
- `evals/twin_eval.py` runs 20 questions (facts, hand-overs, false premises, injections, Arabic and
  English) through the same code path against the real models. First run: 20 of 20, 1.1 s average.
  It costs quota, so it is run by hand before a release, not in CI.

## D36. The AI twin is a floating chat, with its quota protected (W2, 2026-11-14)
- Owner's call: not a page. A chat that follows the visitor across pages and scroll, like a
  messenger, so they can ask something and check it against the page (Experience, the CV). It sits
  in the root layout; the conversation is kept in `sessionStorage`, so it survives page changes and
  a reload and is gone when the tab closes. Nothing is stored on the server.
- Desktop: a panel in the lower right corner, the page stays usable. Phone: a sheet over the lower
  72% of the screen; the page above it still scrolls.
- Only a small launcher ships with every page ("Chat with my AI twin"); the panel's code is fetched
  on first open. The hero's secondary action is now "Ask my AI twin" (D21) and opens the same chat;
  "Download CV" left the hero (the CV button is in the header on every page).
- Four starter questions chosen with the owner so that one click says who he is: a 30-second
  introduction, what runs in production, the project he is proudest of and his part, availability
  and roles.
- Waiting shows a turning amber ring and a shimmering "Thinking", no clock (D32).
- Quota and abuse, on top of D10 (Origin, session token, 30 messages a visitor a day, global cap):
  - a first question (no history) is answered from a 24 h cache keyed by the hash of the question
    and the prompt, so starter and repeated questions cost no model call, and a change to the
    knowledge base empties the cache by itself;
  - at most 8 messages a minute per visitor;
  - follow-ups and replaced answers are never cached.
- The number check accepts a month written as a number only inside a date ("4/2026", "شهر 4") and
  only for a month the knowledge base names. Found by the live eval: a correct Arabic answer was
  being replaced because it wrote April as 4. "7 years of experience" is still rejected.
- Fixed in passing: the hero's glow overflowed the page sideways near 1024 px; `main` now clips it.
- Live eval after these changes: 20 of 20, 1.3 s average, no answer replaced.

## D37. The chat's look, and two ways of saying no (W2, 2026-11-14)
- The owner tried D36 on localhost and found it plain next to the hero. Decisions taken with him:
  - No second use of his portrait: it appears once, in the hero. The twin's mark is a small sphere
    of points turning in 3D (canvas 2D, about 90 points), inside the detector's amber brackets. It
    turns faster and warms to amber while the twin is thinking, so it is also the waiting indicator.
  - Launcher: stays in the lower right corner (where people look for a chat; higher up it would
    cover the text), now a larger pill with the sphere, a light that travels around its edge, a
    glow and lift on hover. Once per visit a short line rises above it, on phones too
    ("Ask me anything"; longer on wide screens).
  - A new status colour, `online` (#3DDC84), used only for the "online" dot. Amber stays the only
    action colour.
  - Hero: "Ask my AI twin" is a real outlined button, the same height as the amber one, with the
    green dot.
  - Panel: soft corners (the chat is the one place that leaves the 2 px box radius), message
    bubbles that rise in, the answer written out word by word, three pulsing dots while waiting,
    an input that grows with the text and an arrow button that turns amber when there is something
    to send, an opening animation. No blur or glass (CLAUDE.md).
  - Two suggested follow-up questions after each answer.
  - Not built now, by his choice: "see it on the page" links under answers.
- The twin now says no in two different ways. A question about Mohamed that it cannot answer
  (salary, visa) still gets the hand-over sentence and the email. Anything unrelated (shopping,
  politics, jokes, coding tasks) or rude gets one warm sentence that it is Mohamed's AI twin and
  only talks about his work, plus two things it can answer, with no email. Before this, "do you
  have shampoo?" was answered with "I'd rather Mohamed answer that himself".
- Live eval grew to 24 questions (shampoo, an insult, politics, a joke): 24 of 24.
- Found on production right after the release: the first starter question ("Introduce yourself")
  was answered as "He is an AI engineer ...". The prompt now gives the opening explicitly ("I am
  Mohamed's AI twin, so I answer as him. I am ..."), replies follow the visitor's language for
  refusals too, and the live eval gained the four starter questions and a stricter check for
  speaking about him instead of as him: 28 of 28. A prompt change empties the answer cache by
  itself, so the cached third-person answer disappears with this release.

## D38. SpotLight's video lives in the repo; the Lab becomes a demo inside Cashy's scene (2026-11-14)
- SpotLight's scene now plays the owner's clip (one scene in four views: foreground mask, wall mask,
  two results). It is re-encoded to H.264, 848x480, no audio, 1.1 MB, with a 30 KB poster, and
  shipped from `public/work/`. That departs from "videos on Hugging Face" on purpose: a clip of
  about 1 MB is lighter than the point files already in the repo, and it needs no second host.
  Larger videos still go to Hugging Face. The WebM encode came out bigger than the MP4 and was
  dropped. The video is muted, loops, loads nothing until it is near the viewport, plays only while
  on screen, and never starts by itself under reduced motion.
- The clip shows footage from a TV series and real brand advertisements used as test material.
  Kept by the owner's choice as a demonstration of the project.
- Owner's calls for W4: no pretrained YOLO demo (not his work), and no `/lab` page. Cashy gets a
  "try it live" inside its scene: upload or pick a photo, get the denomination and the
  genuine/counterfeit result from his own two models, in the browser.
