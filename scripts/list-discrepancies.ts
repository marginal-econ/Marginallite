import * as fs from 'fs';

const rep = JSON.parse(fs.readFileSync('scripts/live-blind-mistral-report.json', 'utf8'));
const disc = rep.results.filter((r: any) => r.diff !== 0);

console.log('Total discrepancies:', disc.length);
disc.forEach((d: any, i: number) => {
  console.log(`\n--- Case ${i + 1}: ${d.candidate} Q${d.questionNumber} (${d.tariff}m) ---`);
  console.log(`Cambridge: ${d.cambridgeMark} | Mistral: ${d.mistralMark} | Diff: ${d.diff}`);
  console.log(`Band: ${d.band}`);
  console.log(`Summary: ${d.examinerSummary}`);
});
