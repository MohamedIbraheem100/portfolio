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
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Could not load ${url}: ${res.status}`);
  return parsePcp3(await res.arrayBuffer());
}

/** Bounding box of the head region (top part of the cloud) as fractions of the cloud's frame. */
export function headBox(data: PointData): { left: number; top: number; width: number; height: number } {
  const { xy, count, aspect } = data;
  // y spans [-1/aspect, 1/aspect] for a landscape cloud (aspect >= 1).
  const yMax = aspect >= 1 ? 1 / aspect : 1;
  const yMin = -yMax;
  const cut = yMin + 0.52 * (yMax - yMin); // head: the top 48% of the cloud's height
  const xs: number[] = [];
  let top = -Infinity;
  for (let i = 0; i < count; i++) {
    const y = xy[i * 2 + 1];
    if (y > cut) {
      xs.push(xy[i * 2]);
      if (y > top) top = y;
    }
  }
  if (xs.length === 0) return { left: 0.3, top: 0.05, width: 0.4, height: 0.5 };
  xs.sort((a, b) => a - b);
  const lo = xs[Math.floor(xs.length * 0.02)];
  const hi = xs[Math.floor(xs.length * 0.98)];
  const xMax = aspect >= 1 ? 1 : aspect;
  const toX = (x: number) => (x + xMax) / (2 * xMax);
  const toY = (y: number) => (yMax - y) / (2 * yMax);
  const pad = 0.025;
  return {
    left: Math.max(0, toX(lo) - pad),
    top: Math.max(0, toY(top) - pad),
    width: Math.min(1, toX(hi) - toX(lo) + 2 * pad),
    height: Math.min(1, toY(cut) - toY(top) + 2 * pad),
  };
}
