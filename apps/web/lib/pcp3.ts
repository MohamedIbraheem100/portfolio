/*
  PCP3: the compact point format for the live hero (tools/pack_points.py).
  Header: "PCP3", uint32 count, float32 aspect. Per point (6 bytes): int16 x, int16 y
  (coordinates scaled by 32767; the taller axis spans [-1, 1]), uint8 depth (rank-equalized,
  255 = nearest), uint8 luma (photo luminance). The mono palette needs nothing else.
*/
export type PointData = {
  count: number;
  aspect: number;
  /** x,y in [-1, 1], interleaved (x0, y0, x1, y1, ...) */
  xy: Float32Array;
  /** 0..1, 1 = nearest */
  depth: Float32Array;
  /** 0..1 photo luminance */
  luma: Float32Array;
};

export function parsePcp3(buf: ArrayBuffer): PointData {
  const magic = String.fromCharCode(...new Uint8Array(buf, 0, 4));
  if (magic !== "PCP3") throw new Error(`Not a PCP3 file (magic ${magic})`);
  const dv = new DataView(buf);
  const count = dv.getUint32(4, true);
  const aspect = dv.getFloat32(8, true);
  const expected = 12 + count * 6;
  if (buf.byteLength < expected) throw new Error("PCP3 file is truncated");
  const xy = new Float32Array(count * 2);
  const depth = new Float32Array(count);
  const luma = new Float32Array(count);
  let o = 12;
  for (let i = 0; i < count; i++) {
    xy[i * 2] = dv.getInt16(o, true) / 32767;
    xy[i * 2 + 1] = dv.getInt16(o + 2, true) / 32767;
    depth[i] = dv.getUint8(o + 4) / 255;
    luma[i] = dv.getUint8(o + 5) / 255;
    o += 6;
  }
  return { count, aspect, xy, depth, luma };
}

export async function loadPoints(url: string, signal?: AbortSignal): Promise<PointData> {
  const res = await fetch(url, { signal, credentials: "omit" });
  if (!res.ok) throw new Error(`Could not load ${url}: ${res.status}`);
  return parsePcp3(await res.arrayBuffer());
}

/**
 * Bounding box of the head, as fractions of the cloud's frame.
 * The head is found from the width profile of the cloud: scanning down from the top, the
 * silhouette widens (forehead to cheeks), narrows (jaw to neck), then widens again
 * (shoulders). The neck, the narrowest row after the head's widest row, is the box bottom.
 */
export function headBox(data: PointData): { left: number; top: number; width: number; height: number } {
  const { xy, count, aspect } = data;
  const yMax = aspect >= 1 ? 1 / aspect : 1;
  const xMax = aspect >= 1 ? 1 : aspect;
  const BINS = 48;
  const minX = new Float32Array(BINS).fill(Infinity);
  const maxX = new Float32Array(BINS).fill(-Infinity);
  const hits = new Uint32Array(BINS);
  for (let i = 0; i < count; i++) {
    const x = xy[i * 2];
    const y = xy[i * 2 + 1];
    const b = Math.min(BINS - 1, Math.max(0, Math.floor(((yMax - y) / (2 * yMax)) * BINS)));
    hits[b]++;
    if (x < minX[b]) minX[b] = x;
    if (x > maxX[b]) maxX[b] = x;
  }
  const width = (b: number) => (hits[b] > 20 ? maxX[b] - minX[b] : 0);
  let top = 0;
  while (top < BINS && width(top) === 0) top++;
  // widest row within the upper half = the head's cheeks/ears
  let headMax = top;
  for (let b = top; b < BINS / 2; b++) if (width(b) > width(headMax)) headMax = b;
  // narrowest row after that = the neck
  let neck = headMax;
  for (let b = headMax; b < Math.min(BINS - 1, headMax + BINS / 2); b++) {
    if (width(b) < width(neck)) neck = b;
    if (width(b) > width(neck) * 1.25 && b > neck + 1) break; // shoulders started
  }
  const xs: number[] = [];
  for (let i = 0; i < count; i++) {
    const y = xy[i * 2 + 1];
    const b = Math.floor(((yMax - y) / (2 * yMax)) * BINS);
    if (b >= top && b <= neck) xs.push(xy[i * 2]);
  }
  if (xs.length === 0) return { left: 0.3, top: 0.05, width: 0.4, height: 0.5 };
  xs.sort((a, b) => a - b);
  const lo = xs[Math.floor(xs.length * 0.01)];
  const hi = xs[Math.floor(xs.length * 0.99)];
  const toX = (x: number) => (x + xMax) / (2 * xMax);
  const pad = 0.02;
  const topF = top / BINS;
  const bottomF = (neck + 1) / BINS;
  return {
    left: Math.max(0, toX(lo) - pad),
    top: Math.max(0, topF - pad),
    width: Math.min(1, toX(hi) - toX(lo) + 2 * pad),
    height: Math.min(1, bottomF - topF + 2 * pad),
  };
}
