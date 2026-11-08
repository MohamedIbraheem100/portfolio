import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import { bricolage800 } from "./og/bricolage-800";

export const alt = `${site.name}, ${site.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/*
  Default OG image: name inside an amber bounding box on night. The display font
  is inlined as base64 (see ./og/bricolage-800.ts) so the function never touches
  the filesystem.
*/
export default async function Image() {

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
            {`${site.role}.`}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Bricolage", data: bricolage800, weight: 800, style: "normal" }],
    },
  );
}
