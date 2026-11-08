"""Photo -> depth-mapped point cloud for the hero (CLAUDE.md: Hero / D9 prototype).

Pipeline (offline, run once per photo):
  1. Remove the background (rembg, isnet-general-use).
  2. Crop to head and shoulders (bounding box of the alpha mask, trimmed below the chest).
  3. Estimate depth with Depth Anything V2 Small (transformers pipeline, CPU is fine).
  4. Sample N points inside the mask and write portrait-<N>.bin:
       per point: float32 x, y, z   (x,y in [-1, 1], aspect preserved; z in [0, 1], 1 = nearest,
                                     percentile-normalized: drives the 3D relief)
                  uint8  r, g, b, c (photo color, and c = rank-equalized depth 0..255: drives the
                                     inferno coloring so the face keeps contrast even though it is
                                     nearly flat compared with the shoulders)
     Header: 4 bytes magic "PCP2", uint32 count, float32 aspect (width / height).
  5. Write previews next to it: cutout.png, depth.png.

Usage:
  python tools/portrait_to_points.py <photo> <out_dir> [--counts 20000,40000,60000] [--seed 7]

Inputs stay in assets-src/ (git-ignored). Only the derived .bin files are published (D3).
"""

from __future__ import annotations

import argparse
import struct
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

MAGIC = b"PCP2"


def remove_background(img: Image.Image) -> Image.Image:
    from rembg import new_session, remove

    session = new_session("isnet-general-use")
    return remove(img, session=session, alpha_matting=False)


def crop_head_and_shoulders(rgba: Image.Image, chest_ratio: float = 1.55) -> Image.Image:
    """Crop to the subject's bounding box, then keep roughly head + shoulders.

    chest_ratio: crop height as a multiple of the head width estimate (the mask width
    at 20% of the subject height, i.e. around the face). 1.35 keeps shoulders and the
    top of the chest, enough for a portrait, without the whole torso.
    """
    a = np.asarray(rgba.split()[-1])
    ys, xs = np.where(a > 128)
    top, bottom, left, right = ys.min(), ys.max(), xs.min(), xs.max()
    subject_h = bottom - top
    face_row = top + int(subject_h * 0.20)
    face_cols = np.where(a[face_row] > 128)[0]
    head_w = (face_cols.max() - face_cols.min()) if face_cols.size else (right - left) // 3
    crop_bottom = min(bottom, top + int(head_w * chest_ratio * 1.6))
    # Horizontal: center on the head, width = shoulders at the crop bottom + margin.
    shoulder_cols = np.where(a[crop_bottom - 1] > 128)[0]
    s_left, s_right = (shoulder_cols.min(), shoulder_cols.max()) if shoulder_cols.size else (left, right)
    margin = int(0.06 * (s_right - s_left))
    box = (max(0, s_left - margin), max(0, top - margin), min(a.shape[1], s_right + margin), crop_bottom)
    return rgba.crop(box)


def estimate_depth(rgb: Image.Image, input_side: int = 1022) -> np.ndarray:
    """Depth Anything V2 Small. The default processor resizes to 518 px; a larger input keeps
    the nose, eye sockets and beard edge, which is what the point cloud needs on a face."""
    import torch
    from transformers import AutoImageProcessor, AutoModelForDepthEstimation

    name = "depth-anything/Depth-Anything-V2-Small-hf"
    processor = AutoImageProcessor.from_pretrained(
        name, size={"height": input_side, "width": input_side}, keep_aspect_ratio=True, ensure_multiple_of=14
    )
    model = AutoModelForDepthEstimation.from_pretrained(name).eval()
    with torch.no_grad():
        inputs = processor(images=rgb, return_tensors="pt")
        pred = model(**inputs).predicted_depth  # (1, h, w)
    depth = pred[0].numpy().astype(np.float32)
    if depth.shape != (rgb.height, rgb.width):
        depth = np.asarray(
            Image.fromarray(depth).resize((rgb.width, rgb.height), Image.BILINEAR), dtype=np.float32
        )
    return depth


def stratified_pick(alpha: np.ndarray, count: int, rng: np.random.Generator) -> np.ndarray:
    """Jittered grid inside the mask: even texture instead of random clumps and holes.

    Cell size is chosen so the grid holds ~count cells over the mask area; cells whose
    jittered sample lands outside the mask are dropped, then the result is trimmed or
    topped up with random mask pixels to hit `count` exactly."""
    h, w = alpha.shape
    area = int((alpha > 128).sum())
    cell = max(1.0, np.sqrt(area / count))
    gy, gx = np.mgrid[0 : h : cell, 0 : w : cell]
    gy = gy.ravel() + rng.uniform(0, cell, gy.size)
    gx = gx.ravel() + rng.uniform(0, cell, gx.size)
    r = np.clip(gy.astype(int), 0, h - 1)
    c = np.clip(gx.astype(int), 0, w - 1)
    keep = alpha[r, c] > 128
    pick = np.stack([r[keep], c[keep]], axis=1)
    if len(pick) >= count:
        return pick[rng.choice(len(pick), size=count, replace=False)]
    extra = np.argwhere(alpha > 128)
    extra = extra[rng.choice(len(extra), size=count - len(pick), replace=False)]
    return np.concatenate([pick, extra])


def sample_points(rgba: Image.Image, depth: np.ndarray, count: int, rng: np.random.Generator):
    arr = np.asarray(rgba)
    alpha = arr[..., 3]
    if int((alpha > 128).sum()) < count:
        raise SystemExit(f"mask has only {(alpha > 128).sum()} px, cannot sample {count}")
    pick = stratified_pick(alpha, count, rng)
    rows, cols = pick[:, 0], pick[:, 1]
    h, w = alpha.shape
    aspect = w / h
    # Normalize to [-1, 1] on the taller axis, keep aspect on the other.
    x = (cols / (w - 1)) * 2 - 1
    y = 1 - (rows / (h - 1)) * 2
    if aspect < 1:
        x *= aspect
    else:
        y /= aspect
    d = depth[rows, cols]
    # Depth Anything returns relative inverse depth (larger = nearer). Normalize on the mask.
    dm = depth[alpha > 128]
    lo, hi = np.percentile(dm, 1), np.percentile(dm, 99)
    z = np.clip((d - lo) / max(hi - lo, 1e-6), 0, 1)
    rgb = arr[rows, cols, :3]
    # Rank-equalized depth for coloring: spreads the (nearly flat) face over the whole ramp.
    order = np.argsort(np.argsort(d))
    c = (order / max(count - 1, 1) * 255).astype(np.uint8)
    rgbc = np.concatenate([rgb, c[:, None]], axis=1)
    # Sub-pixel jitter so dense clouds do not show the pixel grid.
    x = x + rng.uniform(-0.5, 0.5, count) * (2 / w)
    y = y + rng.uniform(-0.5, 0.5, count) * (2 / h)
    return x.astype(np.float32), y.astype(np.float32), z.astype(np.float32), rgbc.astype(np.uint8), aspect


def write_bin(path: Path, x, y, z, rgb, aspect: float) -> None:
    n = len(x)
    with path.open("wb") as f:
        f.write(MAGIC)
        f.write(struct.pack("<If", n, aspect))
        f.write(np.stack([x, y, z], axis=1).astype("<f4").tobytes())
        f.write(rgb.tobytes())  # 4 bytes per point: r, g, b, c


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("photo")
    ap.add_argument("out_dir")
    ap.add_argument("--counts", default="20000,40000,60000")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--max-side", type=int, default=2400, help="downscale before processing")
    args = ap.parse_args()

    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    img = ImageOps.exif_transpose(Image.open(args.photo)).convert("RGB")
    s = args.max_side / max(img.size)
    if s < 1:
        img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    print("photo", img.size)

    cut = remove_background(img)
    cut = crop_head_and_shoulders(cut)
    cut.save(out / "cutout.png")
    print("cutout", cut.size)

    depth = estimate_depth(cut.convert("RGB"))
    alpha = np.asarray(cut.split()[-1]) > 128
    lo, hi = np.percentile(depth[alpha], 1), np.percentile(depth[alpha], 99)
    prev = np.clip((depth - lo) / max(hi - lo, 1e-6), 0, 1)
    prev = (prev * 255).astype(np.uint8) * alpha
    Image.fromarray(prev).save(out / "depth.png")
    print("depth range", float(depth[alpha].min()), float(depth[alpha].max()))

    rng = np.random.default_rng(args.seed)
    for count in (int(c) for c in args.counts.split(",")):
        x, y, z, rgb, aspect = sample_points(cut, depth, count, rng)
        p = out / f"portrait-{count}.bin"
        write_bin(p, x, y, z, rgb, aspect)
        print(f"{p.name}: {p.stat().st_size / 1024:.0f} KB, aspect {aspect:.3f}")


if __name__ == "__main__":
    main()
