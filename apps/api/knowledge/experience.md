# Experience

Source: resume.yaml and my interview answers (2026-11-14). Every number here is also in resume.yaml.

## H.Hunters, AI Engineer (August 2026 to present)

H.Hunters is a company based in the UAE that builds an AI restaurant-management platform. I
work there full-time and remotely. I describe my own AI work, not the company's business or
its customers.

- I own the AI services behind the restaurant owner dashboard, in production, written in
  Python and FastAPI: AI insights and recommendations, customer activity segmentation, usage
  and cost analytics, and knowledge-base management.
- I built an Arabic voice agent that takes restaurant phone orders over Vapi and ElevenLabs.
  An LLM-driven dialogue state machine handles ordering and confirmation. Calls are routed to
  the right restaurant and the session state lives in Redis.
- I added safeguards for LLM cost and reliability: per-call rate limits, concurrency limits and
  a daily spend cap.
- I migrated the AI services to a new production server on Docker Compose, and I maintain them:
  when something breaks live, I diagnose it and fix it.
- The team's code lives in Azure DevOps: I work through branches and pull requests there.

The hardest problem on the voice agent: a real phone call does not behave the way the
documentation describes. The voice platform sends the whole call as one growing message and
sends overlapping requests for the same turn, so an old request could arrive late and add an
item to the order twice. I fixed it in layers: only the new part of what the caller said is
processed, each call has a lock in Redis so two workers never handle it at once, and a late
request can no longer change the order. Anything that costs money, like submitting the order,
is recorded; if its result is unknown it goes to a human instead of being retried.
What I learned: do not trust the documented shape of the data. Confirm it from a real call log
and write the test from that.

## AL Master IT Solutions, AI Engineer Intern (April to July 2026)

- This was an internship. My NTI team of five built the project at the company.
- We built a production agentic chatbot that serves customers in Arabic and English, with
  LangGraph and FastAPI.
- The agent routes each message to one of three paths: general chat, retrieval (RAG) over the
  company's knowledge, or appointment booking. Booking calls the CRM and emails the details to
  the company.
- My part was the backend and the infrastructure: I set the project up (structure, files,
  configuration) and built the caching and the rate limiting with Redis.
- Inference and retrieval latency went down by more than 30%, which brought responses under
  one second. We got there by moving to faster models, and I made the embedding and the
  routing step run at the same time instead of one after the other. I did not keep the exact
  before and after figures.
- My internship certificate lists my achievements and gives me the highest evaluation in the
  team.

## National Telecommunication Institute (NTI), Advanced Computer Vision trainee (January to April 2026)

- Computer vision pipelines for image classification, object detection and segmentation.
- Evaluated CNNs, Vision Transformers and multimodal models; built GANs, autoencoders and
  diffusion models for image synthesis.
- Built LLM agents with LangGraph. The graduation project of the track was SpotLight.

## Watanya Company for Roads, IT Engineer during military service (December 2024 to November 2025)

- Operated IP surveillance systems (NVRs, CCTV, RTSP streams) across multiple sites.
- Supported the integration of face and license plate recognition with live camera feeds and
  managed storage for continuous monitoring.
