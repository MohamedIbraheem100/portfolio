import { describe, expect, it } from "vitest";
import { decode, iou, letterbox, nms, toTensor, type Detection } from "./yolo";

describe("letterbox", () => {
  it("fits a landscape photo into the square and centres it", () => {
    expect(letterbox(1280, 960)).toEqual({ scale: 0.5, width: 640, height: 480, padX: 0, padY: 80 });
  });
  it("fits a portrait photo", () => {
    const box = letterbox(540, 960);
    expect(box.height).toBe(640);
    expect(box.width).toBe(360);
    expect(box.padX).toBe(140);
  });
});

describe("toTensor", () => {
  it("turns RGBA pixels into planar RGB in [0, 1]", () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 51, 102, 153, 255]);
    const t = toTensor(rgba, 2);
    const close = (plane: number, expected: number[]) =>
      expected.forEach((value, i) => expect(t[plane * 4 + i]).toBeCloseTo(value)); // float32 values
    close(0, [1, 0, 0, 0.2]); // red plane
    close(1, [0, 1, 0, 0.4]); // green plane
    close(2, [0, 0, 1, 0.6]); // blue plane
  });
});

/* A fake model output with `anchors` columns: rows cx, cy, w, h, then one row per class. */
function output(anchors: { cx: number; cy: number; w: number; h: number; scores: number[] }[]): Float32Array {
  const classes = anchors[0].scores.length;
  const n = anchors.length;
  const out = new Float32Array((4 + classes) * n);
  anchors.forEach((a, i) => {
    out[i] = a.cx;
    out[n + i] = a.cy;
    out[2 * n + i] = a.w;
    out[3 * n + i] = a.h;
    a.scores.forEach((s, c) => (out[(4 + c) * n + i] = s));
  });
  return out;
}

describe("decode", () => {
  it("keeps the best class above the threshold and maps the box back to the photo", () => {
    const box = letterbox(1280, 960); // scale 0.5, 80 px of padding above and below
    const raw = output([
      { cx: 320, cy: 320, w: 200, h: 100, scores: [0.1, 0.9, 0.2] },
      { cx: 100, cy: 100, w: 50, h: 50, scores: [0.05, 0.1, 0.2] }, // below the threshold
    ]);
    const found = decode(raw, 3, 2, box, 0.25);
    expect(found).toHaveLength(1);
    expect(found[0].classId).toBe(1);
    expect(found[0].score).toBeCloseTo(0.9);
    expect(found[0]).toMatchObject({ x: 440, y: 380, width: 400, height: 200 });
  });
});

describe("nms", () => {
  const d = (x: number, score: number, classId = 0): Detection => ({ x, y: 0, width: 100, height: 100, score, classId });

  it("measures overlap", () => {
    expect(iou(d(0, 1), d(0, 1))).toBe(1);
    expect(iou(d(0, 1), d(200, 1))).toBe(0);
    expect(iou(d(0, 1), d(50, 1))).toBeCloseTo(1 / 3);
  });

  it("keeps one box per note, the most confident, whatever class the others claim", () => {
    const kept = nms([d(0, 0.6, 2), d(5, 0.9, 1), d(300, 0.7, 0)]);
    expect(kept.map((k) => [k.x, k.classId])).toEqual([
      [5, 1],
      [300, 0],
    ]);
  });
});
