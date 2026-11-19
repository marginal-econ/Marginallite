import { chat } from "../ai.server";
import { MODEL_EXAMINER } from "../examiner/config";
import type { DataResponsePaper, DataResponseQuestion, DataResponseExtract } from "./types";

const PARSER_SYSTEM_PROMPT = `You are an expert Cambridge Assessment International Education (CAIE) examination parser.
You specialize in parsing Cambridge IGCSE Economics (0455) Question Papers (QP) and Mark Schemes (MS).

Your goal is to parse Section A (the Data Response question at the beginning of the paper) from the provided Question Paper text and Mark Scheme text.

Extract the following structure cleanly as JSON:
1. Paper metadata:
   - subjectCode: "0455"
   - subjectTitle: "Cambridge IGCSE Economics (0455)"
   - qualificationLevel: "as" or "a2"
   - paperNumber: e.g. "22", "42", "21", "41"
   - examSeries: e.g. "2026_feb_march", "2024_may_june"
   - seriesLabel: e.g. "February/March 2026"
   - totalMarks: integer sum of Section A marks (usually 20)
   - durationMinutes: recommended time in minutes (typically 45)

2. Extract / Case study:
   - title: Title of Section A / Case study (e.g. "1 The market for fast food")
   - paragraphs: array of full string paragraphs
   - sources: sources/citations listed at the end of the extract
   - tables: any structured tables or data charts in the extract with title, headers, and rows

3. Sub-questions in Section A (e.g. 1(a)(i), 1(a)(ii), 1(b), 1(c), 1(d), etc.):
   - number: exact question identifier (e.g. "1(a)(i)", "1(c)")
   - title: complete question stem including mark allocation transcribed VERBATIM without modification or generalization (e.g. "Assess whether decreasing the consumption of fast food will increase unemployment in the US. [6]"). NEVER substitute microeconomic case-study questions into generic macroeconomic essays.
   - maxMark: integer
   - category: "definition" | "calculation" | "short_answer" | "data_interpretation" | "essay_evaluative" (use essay_evaluative for any question worth 6 marks or more)
   - tariff: { "ao1": int, "ao2": int, "ao3": int } where ao1 is Knowledge & Understanding, ao2 is Analysis (incorporating Application to case study context), and ao3 is Evaluation (for 6+ mark evaluative questions, typically 2 marks; 0 for non-evaluative questions). Cambridge IGCSE 0455 has no AO4.
   - hasDiagramRequirement: true if question stem mentions "diagram", "AD/AS", "demand and supply", "curve", or "J-curve"
   - extractLinkageExpected: true if question refers to "the extract", "the table", "paragraph 2", or specific case data
   - markingGuide: EXACT section of the Mark Scheme text that gives the answers, indicative content, or marking rubric for this specific question!
   - indicativePoints: array of specific creditworthy points from the MS
   - calculationGuidance: { formula?: string, correctAnswer?: string, ofrApplies?: boolean, markingSteps?: string[] } (if calculation)
   - rubricLevels: array of levels (e.g. Level 3, Level 2, Level 1 with marksRange, description, and evaluative requirements) if 6+ marks.

OUTPUT MUST BE VALID JSON ONLY (NO MARKDOWN CODE FENCES, NO EXTRA COMMENTARY).`;

export async function parseDataResponseFromTexts(params: {
  qpText: string;
  msText: string;
  defaultLevel?: "as" | "a2";
}): Promise<DataResponsePaper> {
  const { qpText, msText, defaultLevel = "as" } = params;

  // Trim to relevant sections to avoid token overflows
  const cleanQp = qpText.slice(0, 16000);
  const cleanMs = msText.slice(0, 25000);

  const userPrompt = `
QUESTION PAPER (QP) TEXT:
"""
${cleanQp}
"""

MARK SCHEME (MS) TEXT:
"""
${cleanMs}
"""

Parse Section A Economics 0455 Data Response Case Study, its tables, sub-questions, and mark schemes into the specified JSON format.
`.trim();

  try {
    const aiResponse = await chat({
      model: MODEL_EXAMINER,
      temperature: 0.1,
      json: true,
      messages: [
        { role: "system", content: PARSER_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      maxCompletionTokens: 5000,
    });

    const parsed = JSON.parse(aiResponse.text);

    const questions: DataResponseQuestion[] = Array.isArray(parsed.questions)
      ? parsed.questions.map((q: any, idx: number) => ({
          id: `q_${Date.now()}_${idx}`,
          number: String(q.number || `1(${String.fromCharCode(97 + idx)})`),
          title: String(q.title || `Question ${idx + 1}`),
          maxMark: Number(q.maxMark || 4),
          category: q.category || (Number(q.maxMark || 4) >= 6 ? "essay_evaluative" : "short_answer"),
          tariff: {
            ao1: Number(
              q.tariff?.ao1 ??
                (Number(q.maxMark || 4) >= 6 ? 2 : Math.ceil((q.maxMark || 4) * 0.5)),
            ),
            ao2: Number(
              q.tariff?.ao2 ??
                (Number(q.maxMark || 4) >= 6 ? 2 : Math.floor((q.maxMark || 4) * 0.5)),
            ),
            ao3: Number(q.tariff?.ao3 ?? (Number(q.maxMark || 4) >= 6 ? 2 : 0)),
          },
          hasDiagramRequirement: Boolean(
            q.hasDiagramRequirement ??
              /diagram|curve|graph|shift|ad\/as|equilibrium/i.test(q.title || ""),
          ),
          rubricLevels: Array.isArray(q.rubricLevels) ? q.rubricLevels : undefined,
          indicativePoints: Array.isArray(q.indicativePoints) ? q.indicativePoints : undefined,
          calculationGuidance: q.calculationGuidance || undefined,
          markingGuide: String(q.markingGuide || "Mark according to Cambridge IGCSE 0455 standards."),
          extractLinkageExpected: Boolean(q.extractLinkageExpected ?? true),
          syllabusTopic: q.syllabusTopic || "Cambridge IGCSE 0455 Data Response",
        }))
      : [];

    const totalMarks =
      questions.length > 0
        ? questions.reduce((sum, q) => sum + q.maxMark, 0)
        : Number(parsed.totalMarks || 20);

    const extract: DataResponseExtract = {
      title: parsed.extract?.title || "Section A Data Response Extract",
      paragraphs:
        Array.isArray(parsed.extract?.paragraphs) && parsed.extract.paragraphs.length > 0
          ? parsed.extract.paragraphs
          : [cleanQp.slice(0, 1500)],
      sources: parsed.extract?.sources || undefined,
      tables: Array.isArray(parsed.extract?.tables) ? parsed.extract.tables : undefined,
    };

    const paperId = `paper_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    return {
      id: paperId,
      title: parsed.title || `Cambridge IGCSE 0455 Section A Data Response Paper`,
      subjectCode: "0455",
      subjectTitle: "Cambridge IGCSE Economics (0455)",
      qualificationLevel: parsed.qualificationLevel || defaultLevel,
      paperNumber: parsed.paperNumber || (defaultLevel === "a2" ? "42" : "22"),
      examSeries: parsed.examSeries || "custom_series",
      seriesLabel: parsed.seriesLabel || "Uploaded Exam Paper",
      totalMarks,
      durationMinutes: Number(parsed.durationMinutes || 45),
      extract,
      questions,
      isOfficial: false,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("AI Paper Parsing failed, building fallback:", error);
    return buildFallbackDataResponsePaper(cleanQp, cleanMs, defaultLevel);
  }
}

function buildFallbackDataResponsePaper(
  qpText: string,
  msText: string,
  level: "as" | "a2",
): DataResponsePaper {
  const paperId = `paper_fallback_${Date.now()}`;
  const lines = qpText.split("\n").map((l) => l.trim()).filter(Boolean);
  const extractParas = lines.slice(0, 6).filter((l) => l.length > 30);

  return {
    id: paperId,
    title: `Custom Uploaded 0455 Data Response Paper (${level.toUpperCase()})`,
    subjectCode: "0455",
    subjectTitle: "Cambridge IGCSE Economics (0455)",
    qualificationLevel: level,
    paperNumber: level === "a2" ? "42" : "22",
    examSeries: "custom_upload",
    seriesLabel: "Custom Assessment",
    totalMarks: 20,
    durationMinutes: 45,
    extract: {
      title: "Section A Data Response Extract",
      paragraphs: extractParas.length > 0 ? extractParas : [qpText.slice(0, 1000)],
      sources: "Extracted from uploaded examination paper",
    },
    questions: [
      {
        id: "q_fallback_1",
        number: "1(a)",
        title: "Explain the main economic concept identified in the extract. [4]",
        maxMark: 4,
        category: "short_answer",
        tariff: { ao1: 2, ao2: 2, ao3: 0 },
        hasDiagramRequirement: false,
        markingGuide: msText.slice(0, 400) || "Mark according to standard Cambridge IGCSE 0455 guidelines.",
        extractLinkageExpected: true,
      },
      {
        id: "q_fallback_2",
        number: "1(b)",
        title: "Analyse the impacts of the economic policy described in the scenario. [6]",
        maxMark: 6,
        category: "essay_evaluative",
        tariff: { ao1: 2, ao2: 2, ao3: 2 },
        hasDiagramRequirement: true,
        markingGuide: msText.slice(400, 1000) || "Award AO1 knowledge, AO2 application, and AO3 analysis.",
        extractLinkageExpected: true,
      },
      {
        id: "q_fallback_3",
        number: "1(c)",
        title: "Assess whether the government policy discussed will always benefit the economy. [10]",
        maxMark: 10,
        category: "essay_evaluative",
        tariff: { ao1: 3, ao2: 4, ao3: 3 },
        hasDiagramRequirement: false,
        markingGuide: msText.slice(1000, 1800) || "Requires two-sided analysis and contextual evaluation.",
        extractLinkageExpected: true,
      },
    ],
    isOfficial: false,
    createdAt: new Date().toISOString(),
  };
}
