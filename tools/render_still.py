"""Render the hero's static still from a PCP2 point file (D26 mono palette).

Used for: the W1 hero (before the live point cloud ships in W5), the reduced-motion and
no-WebGL fallbacks (motion rules 5 and 6), and the OG image later.

Usage: python tools/render_still.py <portrait.bin> <out.png> [--width 1800] [--size 1.0]
"""

from __future__ import annotations

import argparse
import struct
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

NIGHT = (13, 19, 48)
RAISED = (22, 29, 69)
PHOSPHOR = (233, 236, 245)


def read_pcp2(path: Path):
    buf = path.read_bytes()
    assert buf[:4] == b"PCP2", "not a PCP2 file"
    n, aspect = struct.unpack_from("<If", buf, 4)
    xyz = np.frombuffer(buf, dtype="<f4", count=n * 3, offset=12).reshape(n, 3)
    rgbc = np.frombuffer(buf, dtype=np.uint8, count=n * 4, offset=12 + n * 12).reshape(n, 4)
    return xyz, rgbc, aspect


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("bin")
    ap.add_argument("out")
    ap.add_argument("--width", type=int, default=1800)
    ap.add_argument("--size", type=float, default=1.0, help="point size multiplier")
    ap.add_argument("--supersample", type=int, default=2)
    ap.add_argument("--quality", type=int, default=82)
    args = ap.parse_args()

    xyz, rgbc, aspect = read_pcp2(Path(args.bin))
    ss = args.supersample
    W = args.width * ss
    H = int(W / aspect)
    img = Image.new("RGB", (W, H), NIGHT)
    draw = ImageDraw.Draw(img)

    # Same formulas as the prototype shader (mono palette, halftone sizing).
    x, y, z = xyz[:, 0], xyz[:, 1], xyz[:, 2]
    rgb = rgbc[:, :3].astype(np.float32) / 255
    cdepth = rgbc[:, 3].astype(np.float32) / 255
    luma = np.power(rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32), 0.7)
    luma = np.minimum(luma, 0.92)
    v = np.power(luma, 0.85) * (0.55 + 0.45 * cdepth)
    col = (np.array(RAISED) + (np.array(PHOSPHOR) - np.array(RAISED)) * v[:, None]).astype(np.uint8)
    # x,y are normalized with the taller axis in [-1,1]; map back to pixels.
    if aspect >= 1:
        px = (x * 0.5 + 0.5) * (W - 1)
        py = (0.5 - (y * aspect) * 0.5) * (H - 1)
    else:
        px = ((x / aspect) * 0.5 + 0.5) * (W - 1)
        py = (0.5 - y * 0.5) * (H - 1)
    base = (W / 1000) * 2.1 * args.size
    size = base * (0.45 + 0.9 * luma) * (0.8 + 0.4 * cdepth)
    # draw far points first so near ones sit on top
    order = np.argsort(cdepth)
    for i in order:
        r = float(size[i])
        cx, cy = float(px[i]), float(py[i])
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=tuple(int(c) for c in col[i]))
    img = img.resize((W // ss, H // ss), Image.LANCZOS)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.suffix == ".webp":
        img.save(out, quality=args.quality, method=6)
        print(f"{out} {img.size} {out.stat().st_size // 1024} KB")
    else:
        img.save(out, optimize=True)
        webp = out.with_suffix(".webp")
        img.save(webp, quality=args.quality, method=6)
        print(f"{out} {img.size} {out.stat().st_size // 1024} KB; {webp.name} {webp.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
