// Splits a coursebook's extracted text into one block per chapter/unit/topic
// heading, so a single textbook PDF can be bulk-added to the knowledge base
// as several clean, separately-searchable documents instead of one giant one.
//
// Real coursebook PDFs (Cambridge, Hodder, Oxford, Pearson, etc.) use diverse
// heading conventions:
//  - "Chapter 1: Basic economic ideas", "CHAPTER 1", "Chapter I", "Chapter One"
//  - "Unit 1: The Price System", "UNIT 1", "Unit I"
//  - "Topic 1: Microeconomics", "TOPIC 1"
//  - "Section 1: ...", "Section A: ..."
//  - "Part 1: The Macroeconomy", "PART ONE"
//  - "Module 1: ...", "Theme 1: ..."
//  - "1. Basic economic ideas and resource allocation"
//
// They also repeat headings as running headers on every page of that chapter.
// The algorithm below:
//  1. Detects chapter/unit/topic/section markers with flexible prefixes.
//  2. Collapses consecutive occurrences of the same marker (running headers).
//  3. Prunes spurious short segments (< MIN_CHAPTER_CHARS) and merges them,
//     safely ignoring Table of Contents lines.
//  4. Preserves introductory material and syllabus prefaces.
//  5. Prefixes chapter titles with the book name (e.g. "Cambridge Economics — Chapter 1: Basic Ideas")
//     to maximize RAG lexical scoring (3.0x document_title boost) and accurate source citations.
//  6. For giant textbooks (> 60k characters) lacking explicit keywords,
//     identifies major headings or partitions gracefully on paragraph boundaries
//     so large textbooks are always reliable and manageable.

export type ChapterSplit = { title: string; text: string };

const MIN_CHAPTER_CHARS = 2500;
const MAX_HEADING_LINE_CHARS = 90;

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
};

const NUMBER_WORD_PATTERN =
  "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty";

// Matches Chapter, Unit, Topic, Section, Part, Module, Theme, Book, Paper with number, word number, letter, or Roman numeral
const NAMED_HEADING = new RegExp(
  `^(Chapter|Unit|Topic|Section|Part|Module|Theme|Book|Paper)\\s+(${NUMBER_WORD_PATTERN}|[0-9]{1,3}|[IVXLCDM]{1,6}|[A-Z])\\b\\s*[:.\\-—–]?\\s*(.*)$`,
  "i",
);

// Matches numbered section titles: "1. The Basic Economic Problem" or "1: The Basic Economic Problem"
const NUMBERED_HEADING = /^([0-9]{1,2})\s*[:.\-—–]\s+([A-Z][A-Za-z0-9 ,'&()/-]{3,80})$/;

type Marker = {
  lineIndex: number;
  kind: string;
  number: string;
  title: string;
  displayPrefix: string;
};

const ROMAN_MAP: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
  xi: 11,
  xii: 12,
  xiii: 13,
  xiv: 14,
  xv: 15,
  xvi: 16,
  xvii: 17,
  xviii: 18,
  xix: 19,
  xx: 20,
};

function normalizeNumber(raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (ROMAN_MAP[lower]) return String(ROMAN_MAP[lower]);
  if (NUMBER_WORDS[lower]) return String(NUMBER_WORDS[lower]);
  return raw.trim();
}

function isPlausibleTitle(title: string): boolean {
  if (!title) return true; // heading alone on its line; title follows below
  // Reject Table of Contents lines (leader dots, trailing page numbers)
  if (/\.{3,}|\bpage\s+\d+$|\s+\d+$/i.test(title)) return false;
  // Real titles are short fragments, not body paragraphs or sentences.
  if (/[.!?]\s/.test(title)) return false;
  if (/^[a-z(){}[\]]/.test(title)) return false;
  return true;
}

function collectMarkers(lines: string[]): Marker[] {
  const markers: Marker[] = [];

  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_HEADING_LINE_CHARS) return;

    // 1. Check for named heading: Chapter / Unit / Topic / Section / Part / Module / Theme / Book / Paper
    const namedMatch = NAMED_HEADING.exec(trimmed);
    if (namedMatch) {
      const kindRaw = namedMatch[1]!;
      const kind = kindRaw.charAt(0).toUpperCase() + kindRaw.slice(1).toLowerCase();
      const numRaw = namedMatch[2]!;
      const normalizedNum = normalizeNumber(numRaw);
      const title = (namedMatch[3] ?? "").trim();
      if (isPlausibleTitle(title)) {
        markers.push({
          lineIndex,
          kind,
          number: normalizedNum,
          title,
          displayPrefix: `${kind} ${numRaw}`,
        });
        return;
      }
    }

    // 2. Check for numbered major division: "1. Basic economic ideas"
    const numMatch = NUMBERED_HEADING.exec(trimmed);
    if (numMatch) {
      const num = numMatch[1]!;
      const title = numMatch[2]!.trim();
      if (isPlausibleTitle(title)) {
        markers.push({
          lineIndex,
          kind: "Section",
          number: num,
          title,
          displayPrefix: `Section ${num}`,
        });
      }
    }
  });

  return markers;
}

/** Merge consecutive markers that repeat the same division number (e.g. running page headers). */
function collapseRepeats(markers: Marker[]): Marker[] {
  const collapsed: Marker[] = [];
  for (const marker of markers) {
    const last = collapsed[collapsed.length - 1];
    if (last && last.kind === marker.kind && last.number === marker.number) {
      if (marker.title.length > last.title.length) {
        last.title = marker.title;
      }
      continue;
    }
    collapsed.push({ ...marker });
  }
  return collapsed;
}

function segmentLength(lines: string[], boundaries: Marker[], index: number): number {
  const start = boundaries[index]!.lineIndex;
  const end = boundaries[index + 1]?.lineIndex ?? lines.length;
  return lines
    .slice(start + 1, end)
    .join("\n")
    .trim().length;
}

/** Drop short (spurious) segments and re-collapse, repeating until stable. */
function pruneShortSegments(lines: string[], initial: Marker[]): Marker[] {
  let boundaries = initial;
  let changed = true;
  let guard = 0;

  while (changed && guard < 200) {
    changed = false;
    guard += 1;
    // Check all segments to prune Table of Contents entries where chapters appear every few lines
    for (let index = 0; index < boundaries.length - 1; index++) {
      if (segmentLength(lines, boundaries, index) < MIN_CHAPTER_CHARS) {
        boundaries = [...boundaries.slice(0, index), ...boundaries.slice(index + 1)];
        changed = true;
        break;
      }
    }
    // Also prune trailing boundary if it has almost no text before EOF
    if (!changed && boundaries.length > 1) {
      const lastIndex = boundaries.length - 1;
      if (segmentLength(lines, boundaries, lastIndex) < MIN_CHAPTER_CHARS) {
        boundaries = boundaries.slice(0, lastIndex);
        changed = true;
      }
    }
    if (changed) boundaries = collapseRepeats(boundaries);
  }

  return boundaries;
}

/**
 * Fallback partitioner for giant textbooks that do not contain standard keyword headings.
 * Splits safely on paragraph boundaries.
 */
function partitionLargeText(text: string, baseTitle: string): ChapterSplit[] {
  const TARGET_PART_CHARS = 40_000; // ~12-15 pages of text per part
  const paragraphs = text.split(/\n\s*\n/);
  const parts: ChapterSplit[] = [];

  let currentBuffer = "";
  let partIndex = 1;

  for (const para of paragraphs) {
    if (
      currentBuffer.length + para.length > TARGET_PART_CHARS &&
      currentBuffer.length > MIN_CHAPTER_CHARS
    ) {
      parts.push({
        title: `${baseTitle} — Part ${partIndex}`,
        text: currentBuffer.trim(),
      });
      partIndex += 1;
      currentBuffer = "";
    }
    currentBuffer += `${para}\n\n`;
  }

  if (currentBuffer.trim().length > 0) {
    if (parts.length > 0 && currentBuffer.trim().length < MIN_CHAPTER_CHARS) {
      // Append tiny remainder to previous part
      parts[parts.length - 1]!.text += `\n\n${currentBuffer.trim()}`;
    } else {
      parts.push({
        title: `${baseTitle} — Part ${partIndex}`,
        text: currentBuffer.trim(),
      });
    }
  }

  return parts.length >= 2 ? parts : [{ title: baseTitle, text: text.trim() }];
}

export function splitIntoChapters(text: string, fallbackTitle: string): ChapterSplit[] {
  const cleanFallback = fallbackTitle.trim() || "Coursebook";
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const markers = collapseRepeats(collectMarkers(lines));

  if (markers.length >= 2) {
    const boundaries = pruneShortSegments(lines, markers);
    if (boundaries.length >= 2) {
      const firstMarkerLine = boundaries[0]!.lineIndex;
      const preamble = lines.slice(0, firstMarkerLine).join("\n").trim();
      const chapters: ChapterSplit[] = [];

      // If text preceding Chapter 1 is substantial, preserve as Introduction
      // so syllabus overviews and exam guidance are searchable and citable.
      if (preamble.length >= MIN_CHAPTER_CHARS) {
        chapters.push({
          title: `${cleanFallback} — Introduction`,
          text: preamble,
        });
      }

      boundaries.forEach((marker, index) => {
        const end = boundaries[index + 1]?.lineIndex ?? lines.length;
        let title = marker.title;
        let bodyStart = marker.lineIndex + 1;

        // A heading with no title on its own line often has the title as the
        // next non-blank line — skip any blank lines to find it.
        if (!title) {
          let nextLineIndex = marker.lineIndex + 1;
          while (nextLineIndex < end && lines[nextLineIndex]?.trim() === "") {
            nextLineIndex++;
          }
          const next = lines[nextLineIndex]?.trim() ?? "";
          if (
            next &&
            next.length <= MAX_HEADING_LINE_CHARS &&
            !NAMED_HEADING.test(next) &&
            !NUMBERED_HEADING.test(next) &&
            isPlausibleTitle(next)
          ) {
            title = next;
            bodyStart = nextLineIndex + 1;
          }
        }

        let body = lines.slice(bodyStart, end).join("\n").trim();

        // If preamble was short, fold it into the first chapter so no text is lost
        if (index === 0 && preamble.length > 0 && preamble.length < MIN_CHAPTER_CHARS) {
          body = `${preamble}\n\n${body}`.trim();
        }

        const prefix =
          cleanFallback &&
          !title.toLowerCase().includes(cleanFallback.toLowerCase()) &&
          !marker.displayPrefix.toLowerCase().includes(cleanFallback.toLowerCase())
            ? `${cleanFallback} — `
            : "";

        chapters.push({
          title: `${prefix}${marker.displayPrefix}${title ? `: ${title}` : ""}`,
          text: body,
        });
      });

      if (chapters.length >= 2) {
        return chapters;
      }
    }
  }

  // If explicit headings weren't identified, but text is large (> 60k characters),
  // apply intelligent partitioner (~40k chars / part) so giant books are always manageable and indexed smoothly.
  if (text.length > 60_000) {
    return partitionLargeText(text, cleanFallback);
  }

  return [{ title: cleanFallback, text: text.trim() }];
}
