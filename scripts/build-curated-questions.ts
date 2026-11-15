import fs from "node:fs";
import path from "node:path";
import {
  parseCambridge0455Filename,
  parsePaper2StructuredQuestions,
  extractTextFromPdfBuffer,
} from "./harvest-papers";

async function main() {
  const archiveDir = path.resolve(process.cwd(), "docs/source/archive");
  const files = fs
    .readdirSync(archiveDir)
    .filter((f) => f.startsWith("0455_") && f.includes("_qp_2") && f.endsWith(".pdf"));

  console.log(`Found ${files.length} Paper 2 Question Papers in archive.`);

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const allQuestions: Array<{
    id: string;
    question_text: string;
    topic: string;
    max_mark: number;
    exam_series: string;
    level: string;
    command_word: string;
    question_number: number;
    part: string;
  }> = [];

  for (const file of files) {
    const parsed = parseCambridge0455Filename(file);
    if (!parsed) continue;

    const seriesName = `${parsed.seasonName} ${parsed.year} Paper ${parsed.variant || "22"}`;
    const filePath = path.join(archiveDir, file);
    const buf = fs.readFileSync(filePath);

    try {
      const text = await extractTextFromPdfBuffer(pdfjs, buf);
      const structured = parsePaper2StructuredQuestions(text);
      console.log(`- ${file} (${seriesName}): ${structured.length} questions`);

      for (const q of structured) {
        const id = `0455-${parsed.season}${parsed.year % 100}-q${q.questionNumber}${q.part}`;
        allQuestions.push({
          id,
          question_text: q.text,
          topic: q.topic,
          max_mark: q.mark,
          exam_series: seriesName,
          level: parsed.era,
          command_word: q.commandWord,
          question_number: q.questionNumber,
          part: q.part,
        });
      }
    } catch (err: any) {
      console.warn(`Could not parse ${file}: ${err.message}`);
    }
  }

  console.log(`Total structured questions extracted: ${allQuestions.length}`);

  const outDir = path.resolve(process.cwd(), "src/lib/bank");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, "curated-0455-questions.json");
  fs.writeFileSync(outFile, JSON.stringify(allQuestions, null, 2), "utf8");
  console.log(`Saved curated questions to ${outFile}`);
}

main().catch(console.error);
