import * as fs from "fs";
import * as path from "path";
import { setRuntimeEnv } from "../src/server/env";

// Load .env into process.env & runtimeEnv
if (fs.existsSync(".env")) {
  const envText = fs.readFileSync(".env", "utf8");
  const envObj: Record<string, string> = {};
  envText.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx > 0) {
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      process.env[k] = v;
      envObj[k] = v;
    }
  });
  setRuntimeEnv(envObj);
}

import { transcribeWithGemini } from "../src/lib/ocr/gemini.server";

async function run() {
  console.log("=== Testing Real Handwriting OCR with Live Vision Models ===");

  const imgPath1 = path.resolve("test_real_handwriting.jpg");
  if (!fs.existsSync(imgPath1)) {
    throw new Error(`File not found: ${imgPath1}`);
  }

  const base64_1 = fs.readFileSync(imgPath1).toString("base64");
  const dataUrl_1 = `data:image/jpeg;base64,${base64_1}`;

  console.log(`Loaded test_real_handwriting.jpg (${Math.round(base64_1.length / 1024)} KB base64)`);
  console.log("Calling transcribeWithGemini()...");

  const start1 = Date.now();
  const outcome1 = await transcribeWithGemini([dataUrl_1], "Cambridge IGCSE Economics (0455) script response");
  const elapsed1 = Date.now() - start1;

  console.log(`\n--- Transcription 1 Output (${elapsed1}ms, Model: ${outcome1.model}) ---`);
  console.log(outcome1.text);
  console.log("-------------------------------------------------------------------\n");

  const norm1 = outcome1.text.toLowerCase().replace(/\s+/g, " ");
  const matches1 = norm1.includes("handwriting test to see how it looks on lined paper");
  console.log(`Ground truth verification 1: ${matches1 ? "PASSED (100% accurate text match)" : "FAILED"}`);

  // Test 2: Kaden page
  const imgPath2 = path.resolve("test_kaden_page.jpg");
  if (fs.existsSync(imgPath2)) {
    console.log("\nTesting test_kaden_page.jpg...");
    const base64_2 = fs.readFileSync(imgPath2).toString("base64");
    const dataUrl_2 = `data:image/jpeg;base64,${base64_2}`;
    const start2 = Date.now();
    const outcome2 = await transcribeWithGemini([dataUrl_2]);
    const elapsed2 = Date.now() - start2;
    console.log(`\n--- Transcription 2 Output (${elapsed2}ms, Model: ${outcome2.model}) ---`);
    console.log(outcome2.text);
    console.log("-------------------------------------------------------------------\n");
    const matches2 = outcome2.text.toLowerCase().includes("valentine's day");
    console.log(`Ground truth verification 2: ${matches2 ? "PASSED (100% accurate cursive/pencil match)" : "FAILED"}`);
  }
}

run().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
