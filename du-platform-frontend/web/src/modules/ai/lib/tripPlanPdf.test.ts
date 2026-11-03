import { expect, it } from "vitest";
import { createTripPlanPdf } from "./tripPlanPdf";
it("encodes German and punctuation in WinAnsi and keeps byte offsets valid", () => {
  const bytes = createTripPlanPdf([
    "Übernachtung, Größe, Straße – €100 (Plan)",
  ]);
  const pdf = new TextDecoder().decode(bytes);
  expect(pdf).toContain("/WinAnsiEncoding");
  expect(pdf).toContain("dc6265726e61636874756e67");
  const offset = Number(pdf.match(/startxref\n(\d+)/)![1]);
  expect(pdf.slice(offset, offset + 4)).toBe("xref");
  expect(Array.from(bytes).every(byte => byte < 128)).toBe(true);
});
it("wraps long content and paginates instead of clipping or truncating a plan", () => {
  const pdf = new TextDecoder().decode(
    createTripPlanPdf([
      ...Array.from({ length: 120 }, (_, i) => `${i}: Draft itinerary detail`),
      "longword".repeat(30),
    ])
  );
  expect(pdf).toContain("/Count 3");
  expect(pdf.match(/\/Type \/Page /g)).toHaveLength(3);
  expect(pdf).toContain(Buffer.from("119:").toString("hex"));
  for (const match of pdf.matchAll(/<([a-f0-9]*)> Tj/g))
    expect(match[1].length).toBeLessThanOrEqual(160);
});
