/*
  Pre- and post-processing for a YOLOv8 detection model exported to ONNX
  (input 1x3x640x640, output 1x(4+classes)x8400). Pure functions, no browser
  APIs, so they are unit-tested; the worker (cashy.worker.ts) does the drawing
  and runs the model.
*/
export const INPUT_SIZE = 640;
export const PAD_VALUE = 114; // the grey Ultralytics pads with when it letterboxes

export type Letterbox = { scale: number; padX: number; padY: number; width: number; height: number };
export type Detection = { x: number; y: number; width: number; height: number; score: number; classId: number };

/* How a source image is fitted into the square input: scaled to fit, centred, padded. */
export function letterbox(sourceWidth: number, sourceHeight: number, size = INPUT_SIZE): Letterbox {
  const scale = Math.min(size / sourceWidth, size / sourceHeight);
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);
  return { scale, width, height, padX: Math.floor((size - width) / 2), padY: Math.floor((size - height) / 2) };
}

/* RGBA pixels of the letterboxed square -> planar RGB floats in [0, 1] (NCHW). */
export function toTensor(rgba: Uint8ClampedArray, size = INPUT_SIZE): Float32Array {
  const plane = size * size;
  const out = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    out[i] = rgba[i * 4] / 255;
    out[plane + i] = rgba[i * 4 + 1] / 255;
    out[2 * plane + i] = rgba[i * 4 + 2] / 255;
  }
  return out;
}

/*
  The raw output is laid out row by row: cx, cy, w, h, then one row per class, each
  `anchors` long, in input pixels. Keep the best class of every anchor above
  `minScore` and map the box back to the source image.
*/
export function decode(
  output: Float32Array,
  classes: number,
  anchors: number,
  box: Letterbox,
  minScore: number,
): Detection[] {
  const found: Detection[] = [];
  for (let a = 0; a < anchors; a++) {
    let classId = -1;
    let score = minScore;
    for (let c = 0; c < classes; c++) {
      const s = output[(4 + c) * anchors + a];
      if (s > score) {
        score = s;
        classId = c;
      }
    }
    if (classId === -1) continue;
    const w = output[2 * anchors + a] / box.scale;
    const h = output[3 * anchors + a] / box.scale;
    found.push({
      x: (output[a] - box.padX) / box.scale - w / 2,
      y: (output[anchors + a] - box.padY) / box.scale - h / 2,
      width: w,
      height: h,
      score,
      classId,
    });
  }
  return found;
}

export function iou(a: Detection, b: Detection): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const overlap = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return overlap / (a.width * a.height + b.width * b.height - overlap || 1);
}

/* Non-maximum suppression across classes: one physical note gives one box. */
export function nms(detections: Detection[], threshold = 0.45): Detection[] {
  const sorted = [...detections].sort((a, b) => b.score - a.score);
  const kept: Detection[] = [];
  for (const d of sorted) {
    if (kept.every((k) => iou(k, d) < threshold)) kept.push(d);
  }
  return kept;
}
