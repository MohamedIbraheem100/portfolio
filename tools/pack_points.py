"""PCP2 (float32 xyz + rgb + depth byte) -> PCP3, the compact web format for the live hero.

PCP3 layout (little-endian):
  magic "PCP3" | uint32 count | float32 aspect | then per point: int16 x, int16 y, uint8 z, uint8 luma
  x,y are the PCP2 coordinates scaled by 32767; z is the equalized-depth byte; luma is the photo
  luminance (the mono palette needs nothing else). 6 bytes per point: 40k points = 240 KB.

Usage: python tools/pack_points.py <in.bin> <out.pcp3>
"""

import struct
import sys
from pathlib import Path

import numpy as np

src, dst = Path(sys.argv[1]), Path(sys.argv[2])
buf = src.read_bytes()
assert buf[:4] == b"PCP2", "expected a PCP2 file from portrait_to_points.py"
n, aspect = struct.unpack_from("<If", buf, 4)
xyz = np.frombuffer(buf, dtype="<f4", count=n * 3, offset=12).reshape(n, 3)
rgbc = np.frombuffer(buf, dtype=np.uint8, count=n * 4, offset=12 + n * 12).reshape(n, 4)
luma = (rgbc[:, :3].astype(np.float32) @ np.array([0.299, 0.587, 0.114], dtype=np.float32))
out = np.zeros(n, dtype=[("x", "<i2"), ("y", "<i2"), ("z", "u1"), ("l", "u1")])
out["x"] = np.clip(np.round(xyz[:, 0] * 32767), -32767, 32767)
out["y"] = np.clip(np.round(xyz[:, 1] * 32767), -32767, 32767)
out["z"] = rgbc[:, 3]
out["l"] = np.clip(np.round(luma), 0, 255)
dst.parent.mkdir(parents=True, exist_ok=True)
with dst.open("wb") as f:
    f.write(b"PCP3")
    f.write(struct.pack("<If", n, aspect))
    f.write(out.tobytes())
print(f"{dst} {n} points, aspect {aspect:.3f}, {dst.stat().st_size // 1024} KB")
