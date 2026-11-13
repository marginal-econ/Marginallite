import * as fs from "fs";
import { setRuntimeEnv } from "../src/server/env";

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

import { getActiveProvider } from "../src/lib/ai/active.server";

async function listModels() {
  const cp = await getActiveProvider();
  if (!cp) throw new Error("No chat provider found");

  console.log("Testing Google API Key:", cp.apiKey.slice(0, 10) + "...");
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cp.apiKey}`);
  console.log("Status:", res.status);
  const data = await res.json();
  if (data.models) {
    console.log("Available Google models:");
    data.models.forEach((m: any) => {
      if (m.supportedGenerationMethods?.includes("generateContent")) {
        console.log(` - ${m.name}`);
      }
    });
  } else {
    console.log("Response:", data);
  }
}

listModels().catch(console.error);
