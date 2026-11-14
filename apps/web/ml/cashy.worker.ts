/// <reference lib="webworker" />
import * as ort from "onnxruntime-web/wasm";
import { INPUT_SIZE, PAD_VALUE, decode, letterbox, nms, toTensor, type Detection } from "./yolo";

/*
  Runs the Cashy denomination model off the main thread, so the page stays
  responsive while a photo is analysed. ONNX Runtime Web on WebAssembly, one
  thread: the page is not cross-origin isolated (COOP/COEP stay off the home page),
  and one photo does not need more.

  Messages in:  { type: "load", model: ArrayBuffer }
                { type: "detect", image: ImageBitmap, minScore: number }
  Messages out: { type: "ready" } | { type: "result", detections } | { type: "error", message }
*/

export type WorkerRequest =
  | { type: "load"; model: ArrayBuffer }
  | { type: "detect"; image: ImageBitmap; minScore: number };
export type WorkerReply =
  | { type: "ready" }
  | { type: "result"; detections: Detection[] }
  | { type: "error"; message: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;
let session: ort.InferenceSession | null = null;

// The runtime's .wasm files come from the CDN copy of the exact version that is bundled here.
ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ort.env.versions.web}/dist/`;
ort.env.wasm.numThreads = 1;

async function detect(image: ImageBitmap, minScore: number): Promise<Detection[]> {
  if (!session) throw new Error("The model is not loaded yet.");
  const box = letterbox(image.width, image.height);
  const canvas = new OffscreenCanvas(INPUT_SIZE, INPUT_SIZE);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("This browser cannot prepare the image.");
  ctx.fillStyle = `rgb(${PAD_VALUE},${PAD_VALUE},${PAD_VALUE})`;
  ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
  ctx.drawImage(image, box.padX, box.padY, box.width, box.height);
  image.close();
  const pixels = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
  const input = new ort.Tensor("float32", toTensor(pixels), [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const output = (await session.run({ [session.inputNames[0]]: input }))[session.outputNames[0]];
  const [, rows, anchors] = output.dims as number[];
  return nms(decode(output.data as Float32Array, rows - 4, anchors, box, minScore));
}

scope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  try {
    if (message.type === "load") {
      session = await ort.InferenceSession.create(message.model, { executionProviders: ["wasm"] });
      scope.postMessage({ type: "ready" } satisfies WorkerReply);
    } else {
      const detections = await detect(message.image, message.minScore);
      scope.postMessage({ type: "result", detections } satisfies WorkerReply);
    }
  } catch (err) {
    const text = err instanceof Error ? err.message : "The model could not run.";
    scope.postMessage({ type: "error", message: text } satisfies WorkerReply);
  }
};
