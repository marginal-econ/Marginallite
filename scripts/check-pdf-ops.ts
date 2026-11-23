import fs from "node:fs";

async function run() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfPath = "C:/Users/Saikrish/.gemini/antigravity/brain/90b3b804-d5a9-4736-8bb5-020c470b808d/.user_uploaded/media_1795020190847_07fcc0ca.pdf";
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data }).promise;
  console.log("Total pages in PDF:", doc.numPages);
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const ops = await page.getOperatorList();
    console.log(`Page ${i}: ops count ${ops.fnArray.length}`);
  }
}

run().catch(console.error);
