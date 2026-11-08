import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { site } from "@/lib/site";

export const alt = `${site.name}, ${site.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/*
  Default OG image: name inside an amber bounding box on night. Satori cannot
  read woff2, so a woff copy of the display face lives in lib/og/.
*/
export default async function Image() {
  const fontData = await readFile(join(process.cwd(), "lib/og/bricolage-800.woff"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background: "#0d1330",
          color: "#e9ecf5",
          fontFamily: "Bricolage",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "40px 48px",
            border: "4px solid #ffb01f",
            borderRadius: 2,
            alignSelf: "flex-start",
          }}
        >
          <div style={{ fontSize: 112, lineHeight: 1, letterSpacing: "-0.02em" }}>{site.name}</div>
          <div style={{ marginTop: 24, fontSize: 44, lineHeight: 1, color: "#8b92ab" }}>
            {site.role}.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Bricolage", data: fontData, weight: 800, style: "normal" }],
    },
  );
}
