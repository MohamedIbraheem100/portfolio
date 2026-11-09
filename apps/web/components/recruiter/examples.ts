/*
  Two ready-made job descriptions so a visitor can try Recruiter Mode in one click.
  They are generic roles written for this page, not real postings, and they are not
  tuned to flatter the CV: each one asks for things the CV does not have, because a
  report with honest gaps is the point (see the brief, "Why show the gaps").
*/
export const EXAMPLE_JDS: { label: string; text: string }[] = [
  {
    label: "AI Engineer (agents)",
    text: `AI Engineer, Agentic Systems

We are building customer-facing AI assistants and need an engineer who has shipped LLM applications to production.

Requirements:
- 2+ years building LLM applications in Python (RAG, tool calling, agent workflows).
- Hands-on experience with an orchestration framework such as LangGraph or LangChain.
- Backend skills: FastAPI or similar, PostgreSQL, Redis, REST APIs.
- Experience reducing latency or cost of inference and retrieval pipelines.
- Testing, rate limiting, authentication and deployment of production services.
- Arabic and English communication.

Nice to have:
- Vector databases and evaluation of LLM outputs.
- Kubernetes and cloud infrastructure (AWS or GCP).
- Fine-tuning open models (LoRA / QLoRA).`,
  },
  {
    label: "Computer Vision Engineer",
    text: `Computer Vision Engineer

We deploy vision models on cameras and mobile devices and need an engineer who can take a model from training to the edge.

Requirements:
- Bachelor's degree in computer science, AI or a related field.
- 3+ years of professional experience in computer vision.
- Training and evaluating object detection or segmentation models (YOLO or similar) with reported metrics such as mAP.
- Strong Python, PyTorch or TensorFlow, and OpenCV.
- Optimizing models for on-device inference (TensorFlow Lite, ONNX or quantization).

Nice to have:
- C++ for inference runtimes, TensorRT or NVIDIA Jetson.
- Vision-language models or segmentation foundation models (SAM2).
- Video pipelines: tracking, homography, multi-frame processing.
- Experience with IP cameras and RTSP streams.`,
  },
];
