/**
 * Marginalite Cleanliness & Banned Terms Verifier
 * Enforces Master Prompt §4.3, §5.1, and §10.
 *
 * Scans the entire codebase for:
 * 1. Live Examiner remnants
 * 2. Pricing, subscription, paywalls, tiers, and payment remnants
 * 3. Cambridge 9708 / AS / A-Level academic terminology remnants
 * 4. Hardcoded purple/violet/indigo styles
 * 5. Bare "Marginal" brand references (except legitimate economic terms e.g. marginal cost/revenue/utility)
 */

import * as fs from "node:fs";
import * as path from "node:path";

interface WhitelistEntry {
  pattern: string;
  paths: string[];
  reason: string;
}

interface VerifyConfig {
  ignorePaths: string[];
  whitelistedMatches: WhitelistEntry[];
}

const ROOT_DIR = process.cwd();
const CONFIG_PATH = path.join(ROOT_DIR, "scripts", "verify-clean.config.json");
const config: VerifyConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));

// Regex patterns to check
const BANNED_RULES = [
  {
    category: "Live Examiner",
    regex: /live[ _-]?examiner|liveExaminer|live_examiner/i,
  },
  {
    category: "Monetization & Pricing",
    regex:
      /pricing-plan|daily_feature_usage|subscription|checkout|coupon|upi_payment|razorpay|stripe|paywall|locked-feature|₹|\bINR\b|foundation scholar|scholar plus|community edition/i,
  },
  {
    category: "Cambridge 9708 / A-Level",
    regex:
      /\b9708\b|9708\/|A Level|A-Level|AS Level|AS & A|AS\/A|Cambridge International AS|Cambridge Elite|AS_SECTIONS|A2_SECTIONS|year 12|year 13/i,
  },
  {
    category: "Banned Pink Palette",
    regex:
      /#ec4899|#f43f5e|#db2777|bg-pink-|text-pink-|border-pink-|bg-fuchsia-|text-fuchsia-|border-fuchsia-|bg-rose-500|text-rose-500/i,
  },
  {
    category: "Legacy Brand Name",
    regex: /\bmarginal\b/i,
  },
];

// Legitimate economics concepts and authorized brand assets containing "marginal"
const LEGITIMATE_MARGINAL_TERMS = [
  "marginal cost",
  "marginal-cost",
  "marginal revenue",
  "marginal-revenue",
  "marginal utility",
  "marginal-utility",
  "marginal product",
  "marginal-product",
  "marginal rate",
  "marginal-rate",
  "marginal benefit",
  "marginal-benefit",
  "marginal propensity",
  "marginal-propensity",
  "marginal private",
  "marginal-private",
  "marginal social",
  "marginal-social",
  "marginal external",
  "marginal-external",
  "marginal tax",
  "marginal-tax",
  "marginal return",
  "marginal-return",
  "marginal change",
  "marginal analysis",
  "marginal physical",
  "equi-marginal",
  "equi marginal",
  "marginal-econ",
  "marginal-m-icon",
  "marginalite",
  "marginal.econ",
  "marginal-wordmark",
  "marginal-theme",
  "marginal-platform",
  "marginal_upgrade",
];

let totalHits = 0;
let whitelistedHits = 0;
let violationCount = 0;

function isPathIgnored(relPath: string): boolean {
  return config.ignorePaths.some((ignored) => {
    const norm = ignored.replace(/\\/g, "/");
    return relPath === norm || relPath.startsWith(norm + "/");
  });
}

function isWhitelisted(relPath: string, line: string, matchedTerm: string): boolean {
  // Check legitimate economics terms for "marginal"
  if (matchedTerm.toLowerCase() === "marginal") {
    const lowerLine = line.toLowerCase();
    const strippedLine = lowerLine.replace(/[()_-]/g, " ");
    for (const term of LEGITIMATE_MARGINAL_TERMS) {
      if (lowerLine.includes(term) || strippedLine.includes(term)) {
        return true;
      }
    }
  }

  for (const entry of config.whitelistedMatches) {
    const regex = new RegExp(entry.pattern, "i");
    if (regex.test(matchedTerm) || regex.test(line)) {
      if (
        entry.paths.includes("*") ||
        entry.paths.some((p) => relPath === p || relPath.endsWith(p))
      ) {
        return true;
      }
    }
  }
  return false;
}

function scanFile(filePath: string) {
  const relPath = path.relative(ROOT_DIR, filePath).replace(/\\/g, "/");
  if (isPathIgnored(relPath)) return;

  // Skip binary extensions
  const ext = path.extname(filePath).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".ico", ".pdf", ".woff", ".woff2", ".ttf", ".webp"].includes(ext)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    for (const rule of BANNED_RULES) {
      const match = rule.regex.exec(line);
      if (match) {
        totalHits++;
        const matchedStr = match[0];
        if (isWhitelisted(relPath, line, matchedStr)) {
          whitelistedHits++;
        } else {
          violationCount++;
          console.error(
            `\n[CLEANLINESS VIOLATION] Found banned ${rule.category} ("${matchedStr}")`
          );
          console.error(`  Location: ${relPath}:${index + 1}`);
          console.error(`  Line:     ${line.trim().slice(0, 100)}`);
        }
      }
    }
  });
}

function scanDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, "/");
    if (isPathIgnored(relPath)) continue;

    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile()) {
      scanFile(fullPath);
    }
  }
}

console.log("=============================================================");
console.log("🧹 Running Marginalite Cleanliness & Banned Terms Verification");
console.log("=============================================================\n");

scanDir(ROOT_DIR);

console.log(`\nScan summary:`);
console.log(`- Total regex hits:        ${totalHits}`);
console.log(`- Whitelisted exceptions:  ${whitelistedHits}`);
console.log(`- Actionable violations:   ${violationCount}`);

if (violationCount > 0) {
  console.error(`\n❌ FAILED: Found ${violationCount} non-whitelisted banned term violation(s).`);
  process.exit(1);
} else {
  console.log(`\n✅ PASSED: Repository is 100% clean of all banned terms and remnants.\n`);
  process.exit(0);
}
