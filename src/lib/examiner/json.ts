// Ported from the original Python ExaminerAgent JSON handling.
// Models occasionally wrap or trail JSON with prose, or hit token caps
// mid-generation; recover the complete or repairable object rather than
// failing the whole grading/checking call.

function tryRepairTruncatedJson(raw: string): Record<string, unknown> | null {
  const firstBrace = raw.indexOf("{");
  if (firstBrace === -1) return null;
  let text = raw.slice(firstBrace).trim();

  // Strip trailing markdown fence if present
  text = text.replace(/```+$/, "").trim();

  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{" || char === "[") stack.push(char);
    else if (char === "}") {
      if (stack.length > 0 && stack[stack.length - 1] === "{") stack.pop();
    } else if (char === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === "[") stack.pop();
    }
  }

  // If ended mid-string, close the string
  if (inString) text += '"';

  // Clean trailing dangling colons or commas
  text = text.replace(/:\s*$/, ': ""');
  text = text.replace(/,\s*$/, "");

  // Close unclosed brackets/braces in reverse order
  const remainingStack = [...stack];
  while (remainingStack.length > 0) {
    const open = remainingStack.pop();
    text += open === "{" ? "}" : "]";
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // If syntax error remains (e.g. invalid trailing key without colon), try stripping back to last comma
    try {
      const lastComma = text.lastIndexOf(",");
      if (lastComma > 0) {
        let pruned = text.slice(0, lastComma);
        const prunedStack: string[] = [];
        let pInStr = false;
        let pEsc = false;
        for (let i = 0; i < pruned.length; i++) {
          const c = pruned[i];
          if (pInStr) {
            if (pEsc) pEsc = false;
            else if (c === "\\") pEsc = true;
            else if (c === '"') pInStr = false;
            continue;
          }
          if (c === '"') pInStr = true;
          else if (c === "{" || c === "[") prunedStack.push(c);
          else if (c === "}") {
            if (prunedStack[prunedStack.length - 1] === "{") prunedStack.pop();
          } else if (c === "]") {
            if (prunedStack[prunedStack.length - 1] === "[") prunedStack.pop();
          }
        }
        if (pInStr) pruned += '"';
        while (prunedStack.length > 0) {
          pruned += prunedStack.pop() === "{" ? "}" : "]";
        }
        const reparsed = JSON.parse(pruned);
        if (reparsed && typeof reparsed === "object" && !Array.isArray(reparsed)) {
          return reparsed as Record<string, unknown>;
        }
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export function extractFirstJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();

  try {
    const direct = JSON.parse(trimmed) as unknown;
    if (direct && typeof direct === "object" && !Array.isArray(direct)) {
      return direct as Record<string, unknown>;
    }
  } catch {
    // fall through to scanning
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const haystack = fenced ? fenced[1].trim() : trimmed;

  if (fenced) {
    try {
      const parsedFenced = JSON.parse(haystack) as unknown;
      if (parsedFenced && typeof parsedFenced === "object" && !Array.isArray(parsedFenced)) {
        return parsedFenced as Record<string, unknown>;
      }
    } catch {
      // fall through
    }
  }

  // If the payload starts with or contains an outer root `{`, attempt repairing the root
  // object first so a truncated outer envelope isn't prematurely replaced by an inner sub-object.
  const firstBrace = haystack.indexOf("{");
  if (firstBrace !== -1) {
    const repaired = tryRepairTruncatedJson(haystack.slice(firstBrace));
    if (repaired && Object.keys(repaired).length > 0) {
      return repaired;
    }
  }

  for (let start = 0; start < haystack.length; start++) {
    if (haystack[start] !== "{") continue;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let end = start; end < haystack.length; end++) {
      const char = haystack[end];

      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }

      if (char === '"') inString = true;
      else if (char === "{") depth++;
      else if (char === "}") {
        depth--;
        if (depth === 0) {
          try {
            const parsed = JSON.parse(haystack.slice(start, end + 1)) as unknown;
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              return parsed as Record<string, unknown>;
            }
          } catch {
            // Not a valid object starting here — try the next `{`.
          }
          break;
        }
      }
    }
  }

  // Final fallback truncated repair
  const repairedFinal = tryRepairTruncatedJson(haystack);
  if (repairedFinal) return repairedFinal;

  throw new Error("The examiner returned a response that could not be read as valid JSON.");
}

