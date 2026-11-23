import fs from "node:fs";

async function run() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfPath = "C:/Users/Saikrish/.gemini/antigravity/brain/90b3b804-d5a9-4736-8bb5-020c470b808d/.user_uploaded/media_1795020190847_07fcc0ca.pdf";
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data }).promise;

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const str = textContent.items.map((item: any) => item.str).join(" ").trim();
    console.log(`Page ${i} text length: ${str.length}`);
    if (str.length > 0) {
      console.log(`Page ${i} text: ${str.slice(0, 200)}...`);
    }
  }
}

run().catch(console.error);
