import * as fs from "node:fs";
import * as path from "node:path";

const ROOT_DIR = process.cwd();
const SCANNED_DIRS = ["src", "scripts", "supabase", "public", "docs"];
const SCANNED_ROOT_FILES = [
  "package.json",
  "wrangler.jsonc",
  "vite.config.ts",
  "tsconfig.json",
  "eslint.config.js",
  "README.md",
  "SECURITY.md",
  "DEPLOYMENT.md",
  "SUPABASE_SETUP.md",
  "DECISIONS.md",
];

const IGNORED_PATHS = [
  "node_modules",
  ".git",
  ".output",
  ".nitro",
  ".wrangler",
  "dist",
  "coverage",
  "package-lock.json",
  "bun.lock",
  "scripts/secret-scan.ts", // self
];

// Matches eyJ... JWT tokens
const JWT_PATTERN = /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/;
const LEAKED_PROJECT_REF = /srukuuhxloxdukonmual/i;
// Match standalone 'service_role' or "service_role" literal (not env var names like BACKEND_SERVICE_ROLE_KEY)
const SERVICE_ROLE_LITERAL = /(["'`])service_role\1/i;

let errorCount = 0;

function scanFile(filePath: string) {
  const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, "/");
  if (IGNORED_PATHS.some((ignored) => relPath.startsWith(ignored) || relPath === ignored)) {
    return;
  }

  // Skip binary files
  const ext = path.extname(filePath).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".ico", ".pdf", ".woff", ".woff2", ".ttf"].includes(ext)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    // Skip explanatory documentation in DECISIONS.md where the security advisory explains the leaked key
    if (relPath === "DECISIONS.md") {
      return;
    }

    if (JWT_PATTERN.test(line)) {
      console.error(`[SECRET SCAN FAILURE] JWT token detected at ${relPath}:${index + 1}`);
      console.error(`  Line: ${line.trim().slice(0, 80)}...`);
      errorCount++;
    }

    if (LEAKED_PROJECT_REF.test(line)) {
      console.error(`[SECRET SCAN FAILURE] Leaked Supabase reference detected at ${relPath}:${index + 1}`);
      console.error(`  Line: ${line.trim()}`);
      errorCount++;
    }

    if (SERVICE_ROLE_LITERAL.test(line)) {
      console.error(`[SECRET SCAN FAILURE] 'service_role' literal detected at ${relPath}:${index + 1}`);
      console.error(`  Line: ${line.trim()}`);
      errorCount++;
    }
  });
}

function scanDirectory(dirPath: string) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      scanFile(fullPath);
    }
  }
}

console.log("🔒 Running Secret Scan on codebase...");
for (const dir of SCANNED_DIRS) {
  scanDirectory(path.join(ROOT_DIR, dir));
}
for (const file of SCANNED_ROOT_FILES) {
  const fullPath = path.join(ROOT_DIR, file);
  if (fs.existsSync(fullPath)) {
    scanFile(fullPath);
  }
}

if (errorCount > 0) {
  console.error(`\n❌ Secret scan failed with ${errorCount} secret(s) found!`);
  process.exit(1);
} else {
  console.log("✅ Secret scan passed: Zero secrets or JWT literals found.");
  process.exit(0);
}
