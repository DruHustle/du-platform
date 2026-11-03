// The four supported UI languages use Latin text. WinAnsi preserves German
// umlauts and punctuation with a standard PDF font, without fetching a font.
const windowsAnsi: Record<string, number> = {
  "€": 128,
  "‚": 130,
  ƒ: 131,
  "„": 132,
  "…": 133,
  "†": 134,
  "‡": 135,
  ˆ: 136,
  "‰": 137,
  Š: 138,
  "‹": 139,
  Œ: 140,
  Ž: 142,
  "‘": 145,
  "’": 146,
  "“": 147,
  "”": 148,
  "•": 149,
  "–": 150,
  "—": 151,
  "˜": 152,
  "™": 153,
  š: 154,
  "›": 155,
  œ: 156,
  ž: 158,
  Ÿ: 159,
};
function pdfText(value: string): string {
  return Array.from(value.replace(/→/g, "->"))
    .map(char => {
      const code = windowsAnsi[char] ?? char.codePointAt(0)!;
      const byte = code >= 32 && code <= 255 ? code : 63;
      return byte.toString(16).padStart(2, "0");
    })
    .join("");
}
function wrapLines(lines: string[]): string[] {
  return lines.flatMap(line =>
    line
      .replace(/→/g, "->")
      .split(/\r?\n/)
      .flatMap(part => {
        const wrapped: string[] = [];
        let remaining = part.trim();
        while (remaining.length > 80) {
          const space = remaining.lastIndexOf(" ", 80);
          const cut = space > 0 ? space : 80;
          wrapped.push(remaining.slice(0, cut));
          remaining = remaining.slice(cut).trimStart();
        }
        wrapped.push(remaining);
        return wrapped;
      })
  );
}
export function createTripPlanPdf(lines: string[]): Uint8Array {
  const wrapped = wrapLines(lines);
  const pages: string[][] = [];
  for (let index = 0; index < wrapped.length; index += 50)
    pages.push(wrapped.slice(index, index + 50));
  if (!pages.length) pages.push([]);
  // Courier's fixed width keeps even unbroken URLs within the page margins.
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>",
  ];
  const pageIds: number[] = [];
  pages.forEach((page, index) => {
    const pageId = objects.length + 1,
      streamId = pageId + 1;
    pageIds.push(pageId);
    const content = [
      "BT",
      "/F1 10 Tf",
      "50 780 Td",
      "14 TL",
      ...page.flatMap((line, i) => [i ? "T*" : "", `<${pdfText(line)}> Tj`]),
      "ET",
      "BT",
      "/F1 9 Tf",
      "50 40 Td",
      `<${pdfText(`${index + 1} / ${pages.length}`)}> Tj`,
      "ET",
    ].join("\n");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`
    );
    objects.push(
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
    );
  });
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
