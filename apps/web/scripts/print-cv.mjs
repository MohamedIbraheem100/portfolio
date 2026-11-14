// Print a page to an A4 PDF with Chromium. Used by .github/workflows/cv-pdf.yml.
// Usage: node scripts/print-cv.mjs <url> <out.pdf>
//
// Private copy with a phone number, for sending to an employer directly:
//   CV_PHONE="+20..." node scripts/print-cv.mjs http://localhost:3000/cv ../../assets-src/cv-draft/private.pdf
// The number is added to the contact line of that one PDF. It is never in the repo,
// on the site, in /cv.txt or in the PDF that CI publishes.
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { chromium } from "playwright";

const [url, out] = process.argv.slice(2);
if (!url || !out) {
  console.error("usage: node scripts/print-cv.mjs <url> <out.pdf>");
  process.exit(2);
}

await mkdir(dirname(out), { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print" });
  await page.evaluate(() => document.fonts.ready);
  const phone = process.env.CV_PHONE?.trim();
  if (phone) {
    const added = await page.evaluate((value) => {
      const list = document.querySelector("[data-cv-contact]");
      if (!list || !list.firstElementChild) return false;
      const item = document.createElement("li");
      item.textContent = value;
      list.firstElementChild.after(item); // right after the email
      return true;
    }, phone);
    if (!added) throw new Error("CV_PHONE is set but the contact line was not found on the page");
  }
  await page.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true });
  console.log(`wrote ${out}`);
} finally {
  await browser.close();
}
