import { ImageResponse } from "next/og";
import { isTodo, loadResume } from "@/lib/resume";
import { site } from "@/lib/site";
import { bricolage800 } from "../bricolage-800";
import { portraitJpeg, portraitWidth } from "../portrait";

const size = { width: 1200, height: 630 };

/*
  The SOURCE of the share image (what WhatsApp, LinkedIn and Slack show next to the link).
  The site serves a static JPEG, app/opengraph-image.jpg: the PNG this renders is about
  520 KB because of the dithered portrait, and WhatsApp drops previews over about 300 KB.
  After changing the design or the hero sentence: open /og/source, save it as a JPEG of
  about 85% quality over app/opengraph-image.jpg. It is
  the site in one frame: the point-cloud portrait with the detector's amber box
  locked on the head, the name, the role and the hero sentence, on night.
  The font and the portrait are inlined as base64 (./og/*) so the function never
  touches the filesystem at request time.
*/

const NIGHT = "#0d1330";
const AMBER = "#ffb01f";
const PORTRAIT_LEFT = 440; // puts the head around x = 860
// The head inside the 1023 x 630 still, measured from its pixels, with some air.
const HEAD = { left: PORTRAIT_LEFT + 250, top: 44, width: 340, height: 372 };

export async function GET() {
  const { basics } = loadResume();
  const line = isTodo(basics.headline) ? "" : basics.headline;

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          background: NIGHT,
          color: "#e9ecf5",
          fontFamily: "Bricolage",
        }}
      >
        {/* a pool of light behind the portrait, as in the hero */}
        <div
          style={{
            position: "absolute",
            left: 520,
            top: -120,
            width: 820,
            height: 870,
            display: "flex",
            backgroundImage: "radial-gradient(circle at center, rgba(40,52,110,0.9) 0%, rgba(13,19,48,0) 68%)",
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img
          src={portraitJpeg}
          width={portraitWidth}
          height={630}
          style={{ position: "absolute", left: PORTRAIT_LEFT, top: 0 }}
        />
        {/* the text side fades into the portrait instead of meeting it at an edge */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 760,
            height: 630,
            display: "flex",
            backgroundImage: `linear-gradient(90deg, ${NIGHT} 0%, ${NIGHT} 62%, rgba(13,19,48,0) 100%)`,
          }}
        />

        {/* the detector's box on the head, with its label */}
        <div
          style={{
            position: "absolute",
            left: HEAD.left,
            top: HEAD.top,
            width: HEAD.width,
            height: HEAD.height,
            display: "flex",
            border: `3px solid ${AMBER}`,
            borderRadius: 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: HEAD.left,
            top: HEAD.top - 34,
            display: "flex",
            padding: "5px 12px",
            background: AMBER,
            color: NIGHT,
            fontSize: 20,
            lineHeight: 1.2,
          }}
        >
          person · 40,000 pts
        </div>

        <div
          style={{
            position: "absolute",
            left: 72,
            top: 0,
            width: 560,
            height: 630,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div style={{ width: 72, height: 6, display: "flex", background: AMBER }} />
          <div style={{ marginTop: 28, fontSize: 104, lineHeight: 0.95, letterSpacing: "-0.02em" }}>Mohamed</div>
          <div style={{ fontSize: 104, lineHeight: 0.95, letterSpacing: "-0.02em" }}>Ibrahim</div>
          <div style={{ marginTop: 22, fontSize: 40, lineHeight: 1, color: "#8b92ab" }}>{`${site.role}`}</div>
          {line ? (
            <div style={{ marginTop: 30, fontSize: 29, lineHeight: 1.3, maxWidth: 500 }}>{line}</div>
          ) : null}
          <div style={{ marginTop: 34, fontSize: 24, lineHeight: 1, color: AMBER }}>
            {site.url.replace(/^https?:\/\//, "")}
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
