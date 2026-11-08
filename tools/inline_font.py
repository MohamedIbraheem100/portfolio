"""Inline a font file as a base64 TypeScript module for next/og (see app/og/bricolage-800.ts)."""
import base64, pathlib, sys

src = pathlib.Path(sys.argv[1])
data = src.read_bytes()
b64 = base64.b64encode(data).decode()
chunks = [b64[i : i + 100] for i in range(0, len(b64), 100)]
name = "".join(p.capitalize() if i else p for i, p in enumerate(src.stem.replace("-", "_").split("_")))
out = src.with_suffix(".ts")
out.write_text(
    f"/* {src.name} ({len(data)} bytes), base64-inlined for next/og. Regenerate with tools/inline_font.py. */\n"
    "const base64 =\n  " + " +\n  ".join(f'"{c}"' for c in chunks) + ";\n\n"
    f'export const {name}: ArrayBuffer = Uint8Array.from(Buffer.from(base64, "base64")).buffer;\n',
    newline="\n",
)
print(f"wrote {out} ({out.stat().st_size} bytes)")
