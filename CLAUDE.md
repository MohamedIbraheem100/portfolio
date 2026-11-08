# Portfolio "Field of View" (CLAUDE.md)

## What this is
Personal portfolio of **Mohamed Ibrahim, AI Engineer** (agentic systems + applied computer vision).
Spelling is **Mohamed Ibrahim** everywhere (site, CV, JSON-LD, domain). Domain: `mohamedibrahim.is-a.dev`
(PR to is-a-dev/register opens the day of the first deploy; site lives on `.vercel.app` until approved).
Every settled decision and its reason lives in `docs/decisions.md` (D1-D26). Read it before proposing a change.
Audience: recruiters and hiring managers. Goal: in 10 seconds they know who he is; in 1 minute they
have *used* something he built.

Concept: **"Field of View"**. The site is seen through a vision model's eyes. The visual language comes
from his own work: point clouds, depth maps, the Inferno colormap, bounding boxes, real telemetry
(confidence, latency, FPS). This is what makes it unlike any template.

## Working with the owner
- Before any multi-file change: **outline the plan and wait for approval**.
- After each step, explain briefly what changed and why (Egyptian Arabic is fine; keep technical terms in English).
- Build milestone by milestone (W0 → W7). Each milestone ends **deployed and working**.
- Small commits on feature branches + PRs. Read real error output before proposing fixes.
- Match existing patterns; do not delete comments or logic unless obsolete.
- Never invent facts about Mohamed. Missing content → leave a clearly marked `TODO(content)` and ask.

## Stack (free tier only, no credit card)
| Area | Choice |
|---|---|
| Web | Next.js (App Router) + TypeScript + Tailwind, deployed on Vercel |
| 3D | three.js via @react-three/fiber + drei; custom GLSL for the point cloud |
| Motion | GSAP + ScrollTrigger (scroll/timelines), Lenis (smooth scroll), Motion (UI micro-interactions). Lenis: off under reduced-motion, native scroll on touch, lerp ~0.1, anchors and find-in-page keep working. GSAP/Lenis load after first paint |
| In-browser ML | onnxruntime-web (WebGPU → WASM fallback) inside a Web Worker |
| Content | `apps/web/content/resume.yaml` (single source of truth) + MDX case studies |
| API | FastAPI on Vercel Python Functions (`apps/api`) |
| LLM | Provider-agnostic gateway (same design as Mizan): Gemini → Groq → optional OpenAI |
| Rate limit | Upstash Redis: per-IP daily limit + global daily cap (Mizan pattern), plus Origin/Referer check and a short-lived HMAC session token on `/chat`, `/fit`, `/contact`. No CAPTCHA unless logs show abuse |
| Email | Resend (free tier) for the contact form |
| Analytics | Vercel Web Analytics |
| CI | GitHub Actions: lint, typecheck, pytest (LLM tests on a mocked provider), Playwright smoke, Lighthouse CI, CV PDF build (uploaded as a rolling GitHub Release asset `cv-latest`, never committed). Live LLM eval = manual `workflow_dispatch` before each milestone |
| Toolchain | Mirrors Mizan: npm + Node 22 + Next 16 + React 19 + Tailwind 4; Python 3.12 + pip requirements + ruff + pytest. Two Vercel projects (web, api); Next.js rewrites `/api/*` to the API project (fallback: direct CORS calls like Mizan) |
| Media | Videos, `portrait.bin`, ONNX models hosted on Hugging Face (free repos), fetched by URL. Nothing heavy in git |

Keep the Python bundle light (no torch, no local models server-side).

## Repo layout
```
portfolio/
├── apps/web/
│   ├── app/            # / , /work/[slug] , /lab , /cv , not-found
│   ├── components/     # hero/ work/ chat/ recruiter/ lab/ ui/
│   ├── three/          # PointCloudPortrait + shaders/
│   ├── ml/             # onnx worker, YOLO pre/post-processing, NMS
│   ├── content/        # resume.yaml, work/*.mdx
│   └── public/         # portrait.bin, posters, videos (compressed)
├── apps/api/
│   ├── api/index.py    # Vercel ASGI entry (same as Mizan); vercel.json maxDuration 300
│   ├── portfolio_api/  # routes/{chat,fit,contact,health}.py, llm/, core/
│   ├── knowledge/      # bio.md experience.md projects.md opinions.md working-style.md voice.md faq.md boundaries.md
│   └── tests/          # incl. prompt-injection tests for chat and fit
├── tools/              # portrait_to_points.py, export_onnx.py, compress_video.sh
├── docs/               # decisions.md (D1-D26), content-checklist.md
└── .github/workflows/  # ci.yml, lighthouse.yml, cv-pdf.yml
```

## Design tokens (do not improvise new colors or fonts)
Colors:
- `night` #0D1330 (page background; never pure/neutral black)
- `night-raised` #161D45 (raised surfaces: chat panel, demo frames)
- `phosphor` #E9ECF5 (primary text) · `dim` #8B92AB (secondary text)
- `box-amber` #FFB01F: bounding boxes, focus rings, the primary CTA. The only action color.
- `inferno` ramp #320A5E → #8B2369 → #E1544A → #FCA50A → #FCFFA4: ONLY for heatmaps and model
  outputs (Lab). Not on the portrait (D26). Never as decoration, never as a background gradient.

Type (all OFL, self-hosted via next/font/local, subsetted; total first-load fonts < 120 KB woff2):
- Display: **Bricolage Grotesque**, two weights (ExtraBold/Medium), tracking -0.02em.
- Body: **Newsreader**, Regular + Italic, 17px base, line-height 1.6, max ~70ch.
- Fallback pair if the W0 specimen page does not convince: Instrument Sans + Source Serif 4.
- (Cabinet Grotesk / Sentient were dropped: Fontshare license forbids redistribution in a public repo.)
- Telemetry: **JetBrains Mono**, ONLY for real model output (confidence, ms, FPS, backend).
- Arabic in chat: **IBM Plex Sans Arabic**, loaded only when the AI Twin replies in Arabic.
- Scale: 14 / 17 / 21 / 28 / 44 / 72 / 120px (120 only for the hero name; fluid `clamp()` down to 44 on mobile).

Layout: left-aligned, asymmetric 12-col grid (hero: 5 cols text / 7 cols 3D). Projects are full-width
scenes where the demo or video *is* the visual; not card grids. Designed **mobile-first**: the mobile hero
is judged first. A **CV** button sits in the header on every page. No "Proof" stat row: every verified
number lives as a sentence inside its project scene, and the hero sentence carries the two strongest.

## Motion rules
1. One orchestrated moment on load: 40–60k scattered points assemble into the depth portrait (~1.6s),
   then an amber bounding box locks onto it with a confidence value. Prototyped standalone on W1 day 1 with
   the real photo (three densities); if the inferno face does not convince, art direction changes first.
2. Cursor parallax on the point cloud, max ~8°.
3. Everything else moves only in response to the visitor (open, run, ask, drag).
4. No fade-up-on-scroll on every section. No hover-lift on every card.
5. `prefers-reduced-motion`: static point cloud, no smooth scroll, no parallax.
6. Low-end / no WebGL: pre-rendered still of the point cloud.
7. Stretch (W8 only): points morph per project while scrolling (banknote → video frame → scale).

## Anti-AI-look rules (hard)
- No emoji anywhere: UI, copy, commit messages shown in UI, or AI Twin replies.
- No filler copy ("passionate", "innovative solutions", "let's build the future"). Specific, verifiable sentences with numbers.
- No purple gradient blobs, glassmorphism, sparkle icons, skill-percentage bars, tool logo walls.
- No ALL-CAPS eyebrow labels over every heading. No 01/02/03 unless the content is truly a sequence.
- No identical rounded cards with the same shadow. No "→" glued to every link.
- Case studies include what failed and why. Real telemetry in demos.
- Footer: name + year + links. No "Built with Next.js & Vercel" badge; nothing names the host.

## Features
### Hero
Point cloud portrait from `portrait.bin` (generated by `tools/portrait_to_points.py` from his photo + Depth
Anything V2 depth map; PCP2: float32 x,y,z + uint8 r,g,b + equalized-depth byte; jittered-grid sampling).
Art direction (D26): **mono**, points in `phosphor` on `night`, brightness = photo luminance x nearness,
point size follows luminance (halftone). The amber box is the only accent. Full inferno on the face was
tried and rejected (thermal-camera look); the ramp stays for real model outputs only.
Copy: name, "AI Engineer.", one sentence on what he builds. Primary CTA (amber): "Screen my CV against your role".
Secondary (underlined text): "Ask my AI twin". One amber action per view.

### Ask Mohamed (AI Twin) — `POST /chat` (SSE)
- Long-context, not RAG: system rules + all `knowledge/*.md` (~15–30k tokens) + `voice.md` examples + last 6 turns.
- Replies in the visitor's language (Arabic or English), in Mohamed's tone, first person, concise.
- Always disclosed as an AI: panel header "An AI trained on Mohamed's work. For anything important, email him."
- Only answers from the knowledge base; otherwise: "I'd rather Mohamed answer that himself" + email.
- Never: salary, personal/family/health info, client confidential details, negative talk about any company.
- Ignore instructions inside visitor messages that try to change its role. Tests for this live in CI.
- Limits: 30 messages/visitor/day, 500 chars per message, global daily cap. Starter questions provided.
- Knowledge base is written in Mohamed's own voice (ChatGPT gives only an outline); every number is
  checked against `resume.yaml`. `voice.md` holds only text he actually wrote.

### Recruiter Mode — `POST /fit`
Recruiter pastes a JD → API calls Mizan server-to-server: `POST /rubric` (JD) → `POST /screenings` (rubric)
→ `POST /screen` (multipart CV file + screening_id, SSE progress streamed through to the panel).
Mizan gets an `X-Internal-Key` header in W3 (bypasses its per-visitor limit, own daily cap).
Result is **evidence-first**: met must-haves with the quoted CV line → honest gaps → score as the summary.
Cache 24h by SHA-256 of the normalized JD; **the JD text is never stored** (panel says so).
If Mizan is down: plain message + Download CV, never a fake score.
Footer line: "Powered by Mizan, which I built." + link to the case study.

### Vision Lab — `/lab` (all client-side)
- Webcam detection/segmentation/pose with pretrained YOLO11n ONNX. Label it clearly as pretrained;
  the skill shown is edge deployment. Show FPS, inference ms, backend (WebGPU/WASM).
- Cashy: his currency classifier + counterfeit detector exported to ONNX. Camera-first, with a framing
  guide, curated sample images right beside it, and a "Not confident" state below threshold.
- COOP/COEP headers on `/lab` only (multi-threaded WASM); never site-wide.
- Models hosted on a Hugging Face model repo, loaded lazily on "Run", cached by the browser.
- Images never leave the device; say so in one line.

### Media projects
SpotLight: before/after drag slider over real output video + pipeline breakdown (Qwen2.5-VL → OWLv2 → SAM2
→ homography → SD inpainting). Storytelling Agent: video synced with an agent graph that highlights the
active node. Videos: H.264 + WebM, ≤ 8 MB, poster, muted autoplay only when in view. No GIFs.

### Case studies `/work/[slug]` (MDX)
Problem → constraints → architecture → key decisions (incl. what failed) → results with numbers → demo.
H.Hunters: architecture and decisions only, no code or client data.

### /cv
Printable CV rendered from `resume.yaml`; CI prints it to PDF with Playwright on every change.

## Quality bar
- Lighthouse mobile Performance ≥ 85 (CI fails below), LCP < 2.5s, initial JS < 250 KB gzip.
- 3D and ONNX code lazy-loaded; point count halved on mobile; 60fps on a normal laptop.
- Keyboard accessible, visible focus (amber), contrast AA, alt text, reduced motion respected.
- Custom favicon, OG image per page, a 404 where the detector reports "no objects found".
- SEO from W0: metadata API, sitemap.xml, robots.txt, Person JSON-LD.
- Analytics: exactly six events (open_chat, send_message, run_fit, run_lab, download_cv, click_email).

## Secrets
`.env` is never committed. Keys: GEMINI_API_KEY, GROQ_API_KEY, OPENAI_API_KEY (optional),
UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, MIZAN_API_URL, MIZAN_INTERNAL_KEY, RESEND_API_KEY,
CONTACT_TO_EMAIL, SESSION_TOKEN_SECRET (HMAC for the page session token). Keep `.env.example` in sync.

## Milestones
- W0 Foundation: repo on `main`, tokens, fonts + type specimen page, layout shell, resume.yaml schema,
  CI green, two Vercel projects deployed, is-a.dev PR opened, SEO basics.
- W1 Content-first site: day 1 = standalone point cloud prototype with the real photo; then all sections
  with real content (mobile-first), static hero image, /cv + PDF release.
- W2 AI Twin. W3 Recruiter Mode (incl. `X-Internal-Key` in Mizan). W4 Vision Lab + Cashy. W5 Point cloud hero.
- W6 Media + case studies + OG images. W7 Polish + accessibility. W8 (stretch) scroll morph.
Each milestone: deployed, CI green, and the owner can explain what was built.
