import fs from "node:fs";
import { extractTextFromPdfBuffer } from "./harvest-papers";

async function main() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfPath = "C:/Users/Saikrish/.gemini/antigravity/brain/90b3b804-d5a9-4736-8bb5-020c470b808d/.user_uploaded/media_1795020190847_07fcc0ca.pdf";
  const buf = fs.readFileSync(pdfPath);
  const text = await extractTextFromPdfBuffer(pdfjs, buf);
  console.log("PDF TEXT LENGTH:", text.length);
  console.log("FIRST 1000 CHARS:\n", text.slice(0, 1000));
  fs.writeFileSync("C:/Users/Saikrish/.gemini/antigravity/brain/90b3b804-d5a9-4736-8bb5-020c470b808d/scratch/extracted_user_pdf.txt", text);
}

main().catch(console.error);
