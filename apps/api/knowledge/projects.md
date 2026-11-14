# Projects

Source: resume.yaml, my interview answers (2026-11-14) and Mizan's own decision records.
For team projects I say what the team built and which part was mine. I never name teammates.

## Mizan (solo, live at mizan-hr.vercel.app)

- What it is: an AI recruiter. It screens a CV against a job description and returns a verdict
  for each requirement with the quoted CV line as evidence. It supports decisions; it never
  rejects anyone on its own.
- I am the only engineer on it. I worked with an AI coding assistant as a pair programmer: I
  set the scope and the architecture, and every change went through a pull request that I
  reviewed and merged myself. I did the deployments, the database migrations and the secrets.
- Why I built it: screening CVs takes hours and the judgement differs from person to person and
  is rarely written down. I wanted every score to have a literal line from the CV behind it.
  I also wanted to prove I can take a model all the way to production: Docker, CI/CD, database
  migrations and rate limiting.
- How it works: a LangGraph pipeline (parse, extract, judge, verify, score, explain) on FastAPI,
  with Gemini and Groq behind one gateway and a Next.js front end.
- The part I am proudest of: every quote the model cites is checked in code against the CV
  text. A quote that is not found is discarded, so the score never rests on invented evidence.
- A screening completes in under 10 seconds. No CV files are stored.

What failed, and what I learned:
1. For three pull requests the CI was green while the app crashed on start inside its Docker
   container. The CI built the image but never ran it. I found it by running the image by
   hand. Now the CI runs the image and its migration. A successful build is not a successful
   run.
2. My target was 10 CVs in under a minute. The first real measurement was 220 seconds, because
   of the rate limit of the free LLM tier. Spreading requests over several models and running
   two steps in parallel brought it to about 90 seconds, still short of the target on a free
   tier. I wrote the decision and the numbers down and made the public demo serve precomputed
   results. "Working" and "working under the real constraints" are two different things, and an
   honest record of what was not achieved is better than a flattering number.

## Cashy (graduation project, team of five)

- What it is: a mobile app that identifies Egyptian banknotes and flags counterfeits in real time.
- The team: five people. Two of us were responsible for the AI. My part was training the
  models and connecting them to the Flutter app through the backend.
- Two YOLO models, one for classification and one for counterfeit detection, trained on about
  8,000 images and reaching 95% mAP. This is the project's result, measured on our dataset.
- The models were converted to TensorFlow Lite to run on the phone, with OpenCV preprocessing
  and a Flask backend.
- The project was graded A+ (Excellent).

## SpotLight (NTI graduation project, team of five)

- What it is: a pipeline that inserts advertisements into existing video (films, series,
  football) so that they sit on real surfaces instead of floating.
- My part:
  - the scene-understanding stage: the video is split into frames, Qwen2.5-VL analyses the
    scene, and the surface named in the prompt gets a bounding box;
  - the Gradio interface;
  - making it fit in memory. We ran on Kaggle with two T4 GPUs, so I quantized Qwen to 4-bit
    with bitsandbytes (about 4 GB) and decided which model runs on which GPU, with caching, so
    the pipeline does not run out of memory.
- The rest of the pipeline, built by the team: SAM2 tracks the foreground across frames,
  perspective homography warps the ad to the surface angle, and Stable Diffusion inpainting
  blends the edges.

## Storytelling Agent

- A multi-agent system that turns an idea into an illustrated story: a story-writing agent and
  an image-prompt agent, with routing between them, shown together in an interactive dashboard.
- I have not written more detail about this project yet.

## Bilingual agentic chatbot (AL Master) and the H.Hunters AI services

Both are described in experience.md.

## This portfolio

- The site itself is one of my projects: a live point-cloud portrait rendered with three.js,
  Recruiter Mode (Mizan called server to server, with evidence shown before the score), and
  this AI twin.
