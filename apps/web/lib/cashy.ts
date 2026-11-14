/*
  Cashy's live demo (W4, D38/D39): the denomination model the owner trained for his
  graduation project, running in the visitor's browser. The model file is not in the
  repo; its address is set per environment. Without an address the scene stays text
  only: no button that cannot work.
*/
export const CASHY_MODEL_URL = process.env.NEXT_PUBLIC_CASHY_MODEL_URL ?? "";
export const CASHY_MODEL_MB = 22;

// A detection below this is shown as "Not confident", never as an answer (D16).
export const CONFIDENT = 0.5;
// Boxes below this are not kept at all.
export const MIN_SCORE = 0.25;

// Class order of the trained model (metadata of the export). "unlabel" is its own
// "a note I cannot name" class and is never shown as a denomination.
export const CASHY_CLASSES = ["10-EG", "100-EG", "20-EG", "200-EG", "5-EG", "50-EG", "new10-EG", "new20-EG", "unlabel"];

const LABELS: Record<string, string> = {
  "5-EG": "5 EGP",
  "10-EG": "10 EGP",
  "20-EG": "20 EGP",
  "50-EG": "50 EGP",
  "100-EG": "100 EGP",
  "200-EG": "200 EGP",
  "new10-EG": "10 EGP (polymer note)",
  "new20-EG": "20 EGP (polymer note)",
};

/* The name to show for a class id, or null when it is not a denomination. */
export function denomination(classId: number): string | null {
  return LABELS[CASHY_CLASSES[classId] ?? ""] ?? null;
}

export const CASHY_SAMPLES = [
  { src: "/work/cashy/sample-100.webp", label: "100 EGP note" },
  { src: "/work/cashy/sample-50.webp", label: "50 EGP note" },
  { src: "/work/cashy/sample-200.webp", label: "200 EGP note" },
  { src: "/work/cashy/sample-20-new.webp", label: "New 20 EGP note" },
];
