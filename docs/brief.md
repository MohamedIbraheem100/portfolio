# Portfolio — Field of View


## 1. الفكرة

**"Field of View"**: الموقع كله متشاف من عين vision model. إنت AI Engineer شغال في Computer Vision و Agents، فالـ identity بتيجي من شغلك نفسه: point clouds، bounding boxes، depth maps، heatmaps، confidence scores. كده الموقع مش هيشبه أي template، لأن اللغة البصرية بتاعته ماتنفعش لحد غيرك.

**الهدف:** الـ Recruiter أو الـ Hiring manager يفتح اللينك، وفي أول 10 ثواني يعرف إنت مين، وفي أول دقيقة يكون جرّب حاجة شغالة بإيده.

### القرارات المقفولة

| # | القرار | السبب |
| --- | --- | --- |
| P1 | مجاني 100%، نفس الـ stack بتاع Mizan (Vercel + FastAPI + Gemini/Groq + Upstash) | الـ pipeline جاهز ومجرب |
| P2 | **الـ Wow متركز في 3 أماكن:** الـ Hero، والـ Live demos، والـ AI Twin | الـ animation في كل حتة هي بالظبط اللي بتخلي الموقع يبان AI-generated |
| P3 | الموديلات الخفيفة تشتغل **جوه المتصفح** (ONNX Runtime Web) | مجاني، 24/7، ومفيش صور بتخرج من جهاز الزائر |
| P4 | الموديلات التقيلة (GPU) تتعرض بـ **فيديو حقيقي من الـ output** | مانقدرش نشغلها مجاناً، والفيديو أصدق من أي وصف |
| P5 | محتوى الـ CV في ملف واحد `resume.yaml` | الموقع والـ PDF والـ AI Twin يقروا من نفس المصدر |
| P6 | الموقع بالإنجليزي، والـ AI Twin يرد بلغة الزائر (عربي أو إنجليزي) | الـ Recruiters في الخليج ومصر بيقروا إنجليزي، والعربي بيظهر في الـ chat |
| P7 | دومين مجاني من غير اسم الـ host: `mohamedibrahim.is-a.dev` | Section 9 |
| P8 | الـ Repo اسمه `portfolio`، منفصل عن Mizan | Mizan منتج مستقل والـ Portfolio بيستدعي الـ API بتاعه |

**رأيي الصريح في "9K و انبهارات في كل حتة":** مفيش حاجة اسمها 9K على الويب. اللي بيعمل الإحساس ده هو: WebGL حاد على أي شاشة (Retina)، صورة متصورة كويس، و 60fps من غير تقطيع. والمواقع اللي بتكسب Awwwards مش مليانة effects، هي لحظة واحدة مبهرة وكل اللي حواليها هادي ومتقن.

## 2. Art Direction

الـ Identity مبنية على حاجتين من عالم الـ Computer Vision: **الـ Inferno colormap** (اللي بتشوفه في depth maps و heatmaps) و **الـ Bounding box** كعنصر تفاعل. أي حاجة تانية في التصميم هادية ومنظمة.

### الألوان

| الاسم | Hex | الاستخدام |
| --- | --- | --- |
| Night Lens | `#0D1330` | الخلفية الأساسية (أزرق بنفسجي غامق، مش أسود) |
| Night Raised | `#161D45` | الـ surfaces المرفوعة (chat panel، demo frames) |
| Phosphor | `#E9ECF5` | النص الأساسي |
| Dim | `#8B92AB` | النص الثانوي |
| Box Amber | `#FFB01F` | Bounding boxes، focus ring، الـ CTA الأساسي. اللون الوحيد اللي بينادي على الـ action |
| Inferno ramp | `#320A5E` ← `#8B2369` ← `#E1544A` ← `#FCA50A` ← `#FCFFA4` | **بس** في الـ point cloud و heatmaps و outputs الموديلات. ممنوع كـ decoration |

### الخطوط (مجانية للاستخدام التجاري من Fontshare و Google Fonts)

| الدور | الخط | الملاحظة |
| --- | --- | --- |
| Display | Cabinet Grotesk (Extrabold و Medium) | العناوين الكبيرة، تركيب ضيق (tracking -2%) |
| Body | Sentient (Regular و Italic) | Serif هادي، بيدي إحساس "مكتوب بإيد إنسان"، line-height 1.6، سطر أقل من 70 حرف |
| Telemetry | JetBrains Mono | **بس** لبيانات حقيقية خارجة من موديل: confidence، latency، FPS |
| Arabic (في الـ chat) | IBM Plex Sans Arabic | لما الـ AI Twin يرد عربي |

Type scale: 14 / 17 / 21 / 28 / 44 / 72 / 120px (الـ 120 للاسم في الـ Hero بس).

### الـ Hero

```text
+--------------------------------------------------------------+
|  Mohamed Ibrahim                          Work  Lab  Contact |
|                                                              |
|   .  .. ....  ..       [ 3D point cloud portrait  ]          |
|  AI Engineer.          [ built from your photo +   ]         |
|  I build agents and    [ its depth map; points     ]         |
|  vision systems that   [ drift toward the cursor   ]         |
|  run in production.    [ +---------+ amber box   ]           |
|                        [ | person  | locks on    ]           |
|  [Screen my CV]        [ +---------+ 0.99        ]           |
|  [Ask my AI twin]                                            |
+--------------------------------------------------------------+
```

Left-aligned، grid غير متماثل (5 أعمدة نص / 7 أعمدة 3D). على الموبايل: الـ point cloud فوق بارتفاع 55vh، والنص تحت.

### الـ Motion

1. **اللحظة الوحيدة المنظمة (page load):** 40–60 ألف point متبعثرين بيتجمعوا في 1.6 ثانية ويبقوا وشّك، وبعدين الـ amber box يقفل عليه ويظهر الـ confidence.
2. **الـ Cursor:** parallax خفيف للـ point cloud (أقصى 8 درجات).
3. **الـ Scroll (Signature — stretch goal):** نفس الـ points تتحول (morph) لشكل كل مشروع وإنت نازل: ورقة فلوس لـ Cashy، frame فيديو لـ SpotLight، ميزان لـ Mizan.
4. **باقي الموقع:** motion بس رد على فعل الزائر (يفتح، يجرب، يسأل). مفيش fade-up على كل section.
5. `prefers-reduced-motion`: الـ point cloud يظهر ثابت من غير animation.

## 3. Site Map و الـ Sections

صفحة رئيسية طويلة + صفحة لكل مشروع (case study) + صفحة Lab للـ demos اللي بتشتغل بالكاميرا.

### الصفحات

| Route | المحتوى |
| --- | --- |
| `/` | Hero، Proof، Selected work، Experience، How I build، Contact |
| `/work/[slug]` | Case study: المشكلة، الـ architecture، القرارات، الأرقام، الـ demo |
| `/lab` | Vision Lab: webcam detection و Cashy جوه المتصفح |
| `/cv` | نسخة مطبوعة من الـ CV + زرار Download PDF |
| Panel ثابت | Ask Mohamed (الـ AI Twin) متاح من أي صفحة |
| Panel ثابت | Recruiter Mode (Section 6) |

### ترتيب الصفحة الرئيسية

1. **Hero:** الـ point cloud portrait + الاسم + جملة واحدة + زراين: "Screen my CV against your role" و "Ask my AI twin".
2. **Proof:** 4 أرقام حقيقية بس من شغلك (95% mAP، 30%+ latency reduction، ...)، كل رقم مربوط بالمشروع بتاعه.
3. **Selected work:** كل مشروع scene بعرض الشاشة، مش cards: عنوان، سطرين، والـ demo نفسه (live أو فيديو) هو الصورة.
4. **Experience:** timeline حقيقي (H.Hunters، AL Master، NTI، Watanya) بـ أثر كل دور مش بالمهام.
5. **How I build:** diagram واحد للـ workflow بتاعك (plan ← build ← evaluate ← ship) بدل logo wall للـ skills.
6. **Contact:** email، LinkedIn، GitHub، وزرار Download CV.

## 4. المشاريع وطريقة عرض كل واحد

القاعدة: **اللي ينفع يتجرب يتجرب، واللي ماينفعش يتعرض بفيديو من الـ output الحقيقي**. ومفيش GIF: الـ MP4/WebM أخف بـ 5–10 مرات وأوضح.

| المشروع | طريقة العرض | التشغيل | الـ Wow |
| --- | --- | --- | --- |
| **Mizan** (Flagship) | Live: رابط + Recruiter Mode جوه الـ Portfolio | API بتاع Mizan اللي شغال | الـ Recruiter يعمل screening ليك إنت |
| **Ask Mohamed** (AI Twin) | Live chat panel | FastAPI + Gemini/Groq | يرد بأسلوبك وبمعلومات حقيقية |
| **Cashy** (Currency + Counterfeit) | Live جوه المتصفح: رفع صورة أو كاميرا | YOLO ← ONNX ← ONNX Runtime Web (WebGPU أو WASM) | الموديل بتاعك شغال على موبايل الزائر من غير سيرفر |
| **Vision Lab** | Live webcam: detection + segmentation + pose | YOLO11n pretrained ← ONNX Runtime Web | الـ boxes بتترسم على الزائر نفسه + FPS و latency live |
| **SpotLight** (Ad insertion) | Before/After slider على فيديو + pipeline breakdown | فيديو مسجل من الـ output الحقيقي | تسحب الـ slider وتشوف الإعلان اتحط ازاي |
| **Storytelling Agent** | فيديو + agent graph تفاعلي | فيديو مسجل | الـ graph بينوّر مع كل مرحلة في الفيديو |
| **H.Hunters** | Case study (architecture + القرارات) | مفيش كود أو بيانات عملاء | بيبين مستوى Head of AI |

### ملاحظات مهمة

- **Cashy محتاج الـ weights بتاعتك** (`.pt` أو `.tflite`). نحولها لـ ONNX بـ `model.export(format="onnx")`، ولو ضايعة يبقى Cashy فيديو.
- **Vision Lab بيستخدم موديل pretrained**، وده لازم يتكتب بوضوح. المهارة اللي بتتعرض هنا هي **Edge deployment** (تحويل و quantization وتشغيل في المتصفح)، مش التدريب.
- الـ Model files (حتى لو 10–20 MB) تترفع على Hugging Face Hub (model repo مجاني) وتتحمل lazy لما الزائر يضغط "Run"، وتتخزن في الـ browser cache.
- الفيديوهات: 1080p، H.264 + WebM، أقل من 8 MB لكل واحد، مع poster image، و autoplay muted لما يظهر في الشاشة بس.

## 5. Ask Mohamed: الـ AI Twin

الـ AI Twin بيرد بأسلوبك ومن معلومات إنت راجعتها بنفسك، **وبيقول بوضوح إنه AI**. لو Recruiter اكتشف إنه كان بيكلم bot فاكر إنه إنت، ده بيهد الثقة اللي الموقع كله بيبنيها.

### الـ Architecture: ليه مش RAG؟

الـ Knowledge base بتاعتك هتبقى تقريباً 15–30 ألف token. ده بيدخل كله في الـ context window بتاع Gemini Flash، فـ **Long-context stuffing أدق وأبسط من RAG** هنا: مفيش chunking بيضيّع الـ context، ومفيش vector DB. ننقل لـ RAG بس لو الـ KB عدّت 100 ألف token. **ده قرار تقدر تتكلم عنه في أي interview.**

1. الزائر يسأل ← `POST /chat` (SSE streaming).
2. الـ API يبني الـ prompt: system rules + `knowledge/*.md` + أمثلة من أسلوبك + آخر 6 رسايل.
3. LLM Gateway (Gemini ← Groq) يرد بلغة السؤال.
4. الرد بيظهر بـ streaming، ومعاه links للمشاريع اللي اتذكرت.

### الـ Knowledge Base (ملفات Markdown في الـ repo)

| الملف | المحتوى |
| --- | --- |
| `bio.md` | مين إنت، رحلتك، ليه AI |
| `experience.md` | كل دور: المشكلة، اللي عملته، الأثر |
| `projects.md` | كل مشروع بتفاصيل تقنية وقرارات وليه |
| `opinions.md` | آرائك التقنية (RAG vs fine-tuning، إزاي بتختار موديل...) |
| `working-style.md` | إزاي بتشتغل، إيه اللي بيحمسك، نوع الفريق اللي عايزه |
| `voice.md` | 10–15 مثال من ردود كتبتها إنت (عربي وإنجليزي) عشان الـ style |
| `faq.md` | أسئلة الـ Recruiters المتكررة وإجاباتك (availability، relocation، remote) |
| `boundaries.md` | اللي ممنوع يتقال |

### خطوات جمع المعلومات من ChatGPT

1. افتح ChatGPT وابعتله الـ prompt اللي تحت.
2. انسخ الرد في ملف draft على جهازك.
3. **راجع كل سطر بنفسك** وامسح أي حاجة خاصة. ChatGPT بيفتكر حاجات كتير مانتش عايزها على موقع عام، وممكن يكون فيها غلط.
4. Claude Code يقسمها على الملفات اللي فوق، وإنت تراجع تاني قبل الـ commit.

```text
I'm building a public "AI twin" for my portfolio website that answers recruiters' questions about me.
From everything you know about me (memory and our past chats), write a structured profile in English with these sections:
1) Bio and career story  2) Work experience with concrete results  3) Projects with technical details and decisions
4) My technical opinions  5) How I work and what motivates me  6) Goals and the roles I want
7) 15 short examples of how I write and explain things (keep my real tone)
Rules: only professional information suitable for a public website. Do NOT include family, health, finances, salary,
address, phone, ID numbers, or anything private. Mark anything you are unsure about with [VERIFY].
```

### الـ Guardrails

- أول رسالة والـ header: "This is an AI trained on Mohamed's work. For anything important, email him."
- مايقولش أي حاجة مش موجودة في الـ KB، ويرد "I'd rather Mohamed answer that himself" + الـ email.
- مايتكلمش عن المرتب، أو بيانات شخصية، أو أي شركة بشكل سلبي، أو تفاصيل سرية عن عملاء H.Hunters.
- ماينفذش أوامر الزائر اللي بتغير دوره (prompt injection)، وده test ثابت في الـ CI.
- Rate limit: 30 رسالة لكل زائر في اليوم، وأقصى 500 حرف للسؤال.
- 4 أسئلة جاهزة كبداية: "What did you build at H.Hunters?"، "Walk me through Mizan's architecture"، "Why computer vision?"، "Are you open to relocation?"

## 6. Recruiter Mode

Recruiter Mode هي الـ feature اللي بتربط الـ Portfolio بـ Mizan: الـ Recruiter يلصق الـ Job Description بتاعه، وMizan يعمل screening للـ CV بتاعك قدامه live، بـ evidence من الـ CV نفسه. هو بيجرب منتجك وبيقيّمك في نفس اللحظة.

1. زرار "Screen my CV against your role" في الـ Hero وفي الـ navigation.
2. Panel يفتح: textarea للـ JD + مثالين جاهزين (AI Engineer، Computer Vision Engineer).
3. الـ Portfolio API يبعت الـ JD + الـ CV بتاعك لـ Mizan API (`/rubric` ثم `/screen`).
4. النتيجة: Fit score، الـ must-haves المتحققة ومعاها السطر من الـ CV، والـ gaps بصراحة.
5. تحت النتيجة: "Powered by Mizan, which I built. See how it works" + زرار للـ email.

**ليه الـ gaps تظهر بصراحة؟** لأن أداة بتقول "أنا مناسب 100%" لكل وظيفة محدش هيصدقها. الصدق هنا هو اللي بيخلي الـ score العالي يبقى ليه قيمة.

**التكامل التقني:** Mizan API لازم يسمح بـ CORS من دومين الـ Portfolio، أو (الأفضل) الـ Portfolio API هو اللي يكلمه server-to-server بـ API key داخلي، عشان الـ rate limit بتاع Mizan مايتأثرش. النتيجة تتعملها cache بـ hash الـ JD لمدة 24 ساعة.

## 7. Architecture و Tech Stack

نفس الـ pattern بتاع Mizan: Next.js على Vercel، FastAPI كـ Vercel Python Functions، وكل الـ Computer Vision جوه المتصفح. التكلفة صفر.

### Frontend

| الغرض | الأداة |
| --- | --- |
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS بـ design tokens (Section 2) |
| 3D | Three.js عن طريق React Three Fiber + drei، و custom shaders للـ point cloud |
| Scroll + timeline animation | GSAP + ScrollTrigger (مجاني بالكامل حالياً) |
| Smooth scroll | Lenis |
| UI micro-interactions | Motion (Framer Motion) |
| In-browser ML | onnxruntime-web (WebGPU مع fallback لـ WASM)، في Web Worker |
| Content | MDX للـ case studies + `resume.yaml` |
| Analytics | Vercel Web Analytics (cookie-less) |

### Backend: `apps/api` (FastAPI)

| Endpoint | الوظيفة |
| --- | --- |
| `POST /chat` | الـ AI Twin، streaming SSE |
| `POST /fit` | Recruiter Mode ← Mizan API |
| `POST /contact` | رسالة من الـ form ← email ليك (Resend free tier) |
| `GET /health` | Uptime monitoring |

Shared: LLM Gateway (نفس كود Mizan)، Upstash rate limit، structured logging.

### الـ 3D Portrait pipeline (offline، مرة واحدة)

1. صورتك (أقل حاجة 2000px، خلفية بسيطة، إضاءة جانبية).
2. Background removal (rembg محلياً).
3. Depth map بـ Depth Anything V2 (Hugging Face Space مجاني أو Colab).
4. Script Python يعمل sampling لـ 40–60 ألف نقطة (x، y، depth، color) ويحفظهم في `portrait.bin` (أقل من 1 MB).
5. الـ Shader بيلوّن النقط بالـ Inferno ramp حسب الـ depth.

### Repo Structure

```text
portfolio/
├── apps/web/
│   ├── app/              # /, /work/[slug], /lab, /cv
│   ├── components/       # hero/, work/, chat/, recruiter/, lab/
│   ├── three/            # PointCloudPortrait, shaders/
│   ├── ml/               # onnx worker, yolo pre/post-processing, NMS
│   └── content/          # resume.yaml, work/*.mdx
├── apps/api/
│   ├── portfolio_api/    # routes/, llm/, core/
│   ├── knowledge/        # bio.md, projects.md, voice.md, boundaries.md ...
│   └── tests/            # incl. prompt-injection tests
├── tools/                # portrait_to_points.py, export_onnx.py
├── .github/workflows/    # ci.yml, lighthouse.yml, cv-pdf.yml
└── CLAUDE.md
```

### CI/CD (تكملة للي اتعلمته في Mizan)

- **Lighthouse CI** على كل PR: لو الـ Performance نزل تحت 85 الـ PR يفشل. ده اللي هيحميك من إن الـ 3D يتقل الموقع وإنت مش واخد بالك.
- **Playwright** smoke tests: الصفحات بتفتح، الـ chat بيرد، الـ Lab بيحمل الموديل.
- **CV PDF أوتوماتيك:** مع كل تغيير في `resume.yaml`، Playwright يطبع صفحة `/cv` لـ PDF ويحطها في الموقع.

## 8. قواعد الـ Anti-AI Look و الـ Performance

الموقع لازم يبان إن فريق محترف سهر عليه. القواعد دي مكتوبة في `CLAUDE.md` وممنوع كسرها.

### ممنوع نهائياً

- أي emoji في الموقع أو في ردود الـ AI Twin.
- جمل زي "Hi, I'm passionate about..."، "Crafting innovative solutions"، "Let's build the future together".
- Gradient blobs بنفسجي، glassmorphism cards، sparkles، أيقونات نجوم للـ AI.
- Grid من cards متشابهة بنفس الـ border-radius ونفس الـ shadow.
- Skill bars و نسب مئوية للمهارات ("Python 90%").
- Logo wall لكل tool استخدمته.
- Labels ALL CAPS فوق كل عنوان، وأرقام 01 / 02 / 03 لحاجات مش متسلسلة.
- Fade-up animation على كل section.
- أي رقم أو ادعاء مش حقيقي.

### اللي بيخليه يبان متعوب عليه

- **كلام محدد:** "Cut retrieval latency 30% by moving reranking after the cache" بدل "Optimized performance".
- **تفاصيل صغيرة متقنة:** favicon مخصوص، 404 page فيها الـ detector بيقول "no objects found"، OG image لكل صفحة، و focus states واضحة.
- **Case studies فيها الفشل كمان:** "جربت X ومانفعش عشان Y". ده أكتر حاجة بتبين إن فيه إنسان حقيقي.
- **Telemetry حقيقية في الـ demos:** FPS، inference ms، backend (WebGPU أو WASM).
- **صورتك الحقيقية**، مش avatar أو صورة AI-generated.

### Performance Budget

| المقياس | الهدف |
| --- | --- |
| Lighthouse Performance (mobile) | 85 أو أكتر |
| LCP | أقل من 2.5 ثانية |
| JS لأول تحميل | أقل من 250 KB gzip (الـ 3D و ONNX بيتحملوا lazy) |
| Point cloud | 60fps على laptop، ونص عدد النقط على الموبايل |
| Accessibility | الـ keyboard شغال في كل حتة، contrast AA، reduced-motion |

**الـ Fallback:** لو الجهاز مافيهوش WebGL أو ضعيف، الـ Hero يظهر صورة static من نفس الـ point cloud (pre-rendered).

## 9. الدومين و الـ Deploy

اللينك هيبقى `mohamedibrahim.is-a.dev` (أو أقرب اسم متاح)، مجاناً ومن غير أي اسم host. الـ Hosting نفسه هيفضل Vercel، لكن الزائر مش هيشوف ده.

**is-a.dev** خدمة open-source بتدي الـ developers subdomain مجاني. التسجيل عن طريق Pull Request على GitHub، وبيدعم Vercel رسمياً ([الدليل](https://docs.is-a.dev/guides/vercel/)).

1. اعمل deploy للـ Portfolio على Vercel (هياخد لينك `.vercel.app` مؤقت).
2. في Vercel: Settings ← Domains ← أضف `mohamedibrahim.is-a.dev`، وهيديك الـ DNS records.
3. اعمل Fork لـ [is-a-dev/register](https://github.com/is-a-dev/register)، وأضف ملف `domains/mohamedibrahim.json` بالـ records.
4. افتح PR وحط screenshot للموقع (الـ template بتاعهم بيطلبه).
5. بعد الـ merge، الدومين بيشتغل عادةً خلال يوم.

**مهم:** الموافقة بتاخد وقت ومش في إيدنا، فابدأ الـ PR **أول ما أول deploy ينزل**. واعمل نفس الحاجة لـ Mizan: `mizan.mohamedibrahim.is-a.dev` أو `mizan-hr.is-a.dev`.

**يوم ما يبقى معاك دخل:** دومين `.dev` خاص بتاعك بيتربط بنفس الطريقة في 5 دقايق، من غير ما تغير أي كود.

## 10. Roadmap و Milestones

كل Milestone بتنزل live قبل اللي بعدها، عشان لو وقفنا في أي نقطة يبقى عندك موقع شغال ومحترم.

| # | Milestone | المحتوى | معيار الإنجاز |
| --- | --- | --- | --- |
| W0 | Foundation | Repo، design tokens، الخطوط، layout، `resume.yaml`، CI، deploy، PR لـ is-a.dev | لينك live بصفحة فاضية بس بالخطوط والألوان |
| W1 | Content-first site | كل الـ sections بمحتوى حقيقي، Hero بصورة static، `/cv` + PDF | موقع كامل ومحترم **من غير أي 3D** |
| W2 | AI Twin | `/chat` + Knowledge base + chat panel + guardrails tests | يرد صح على 20 سؤال اختبار + injection test ناجح |
| W3 | Recruiter Mode | `/fit` ← Mizan API + الـ panel | JD حقيقي بيرجع نتيجة بـ evidence في أقل من 30 ثانية |
| W4 | Vision Lab + Cashy | ONNX Runtime Web worker، webcam detection، Cashy | شغال على Chrome و Safari والموبايل |
| W5 | The Hero | Point cloud portrait + load sequence + bounding box lock | 60fps، و Lighthouse لسه 85+ |
| W6 | Media + Case studies | فيديوهات SpotLight و Storytelling، كل الـ MDX case studies، OG images | كل مشروع ليه صفحة كاملة |
| W7 | Polish | 404، favicon، accessibility pass، reduced motion، مراجعة نهائية للنصوص | تبعت اللينك لـ 3 أشخاص وتاخد feedback |
| W8 (stretch) | Signature morph | الـ point cloud يتحول مع الـ scroll لشكل كل مشروع | بس لو كل اللي فات خلص |

**ليه الـ 3D في W5 مش في الأول؟** لأن المحتوى والـ demos هم اللي بيجيبوا شغل، والـ 3D بيخلي الناس تفتكرك. موقع بـ 3D مبهر ومحتوى ضعيف أسوأ من موقع هادي بمحتوى قوي. وكمان لو الـ 3D أخد وقت أكتر من المتوقع، الموقع يكون شغال أصلاً.

**بصراحة عن الوقت:** الـ Plan ده مش يوم واحد. W0–W3 ممكن يخلصوا في يوم شغل طويل، لكن الـ Hero والـ Lab محتاجين تجربة وتظبيط بعينك على أجهزة حقيقية.

## 11. اللي محتاجه منك قبل البداية

من غير الحاجات دي، Claude Code هيحط placeholders والموقع هيبان ناقص.

### ضروري لـ W0–W1

- [ ] **H.Hunters:** المسمى، تاريخ البداية، 3–4 إنجازات بأرقام، وإيه المسموح يتقال علني
- [ ] **AL Master:** تاريخ النهاية
- [ ] **الـ CV المحدث** (أو نكتبه مع بعض مباشرة في `resume.yaml`)
- [ ] **صورة احترافية:** 2000px أو أكتر، خلفية بسيطة، إضاءة جانبية، نص الجسم
- [ ] **رابط Mizan live** + اسم الـ repo
- [ ] الاسم اللي عايزه في الدومين (`mohamedibrahim` أو `mohamed` أو غيره)

### لـ W2–W6

- [ ] الـ Profile من ChatGPT بعد ما تراجعه (Section 5)
- [ ] 10–15 رد من كتابتك عشان الـ voice
- [ ] **Cashy weights** (`.pt` أو `.tflite`) + 5–10 صور عملات للـ demo
- [ ] **فيديو SpotLight:** الـ input والـ output لنفس المشهد (10–20 ثانية)
- [ ] **فيديو Storytelling Agent:** screen recording للـ flow كامل
- [ ] لينكات GitHub لكل مشروع public

### الخطوة الجاية

حط `CLAUDE.md` في folder جديد اسمه `portfolio`، وابدأ Claude Code session بـ W0. الحاجات اللي في "ضروري" لازم تبقى جاهزة قبل W1.

### Sources

- [is-a.dev: Vercel setup guide](https://docs.is-a.dev/guides/vercel/)
- [is-a-dev/register on GitHub](https://github.com/is-a-dev/register)
- [Run YOLO in the browser with ONNX Runtime Web (PyImageSearch)](https://pyimagesearch.com/2025/07/28/run-yolo-model-in-the-browser-with-onnx-webassembly-and-next-js/)
