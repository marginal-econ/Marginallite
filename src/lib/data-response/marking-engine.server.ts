import { chat } from "../ai.server";
import { MODEL_EXAMINER } from "../examiner/config";
import { cleanStars, stripStars } from "@/lib/utils";
import type {
  DataResponseQuestion,
  DataResponseExtract,
  QuestionEvaluationResult,
  DataResponseSubmissionResult,
  DataResponsePaper,
  DiagramEvaluationResult,
} from "./types";

const DATA_RESPONSE_MARKING_SYSTEM = `You are an expert Cambridge IGCSE Economics (0455) (0455) Principal Examiner grading Section A Data Response papers.

Your objective is to evaluate candidate scripts strictly, objectively, and accurately according to official Cambridge marking practices.

### CRITICAL ENFORCEMENT: ZERO-HALLUCINATION & STRICT MS GROUNDING

1. EXACT QUESTION EXTRACTION (NEVER REPHRASE OR SUBSTITUTE):
- You must grade against the question text VERBATIM as provided from the question paper and mark scheme.
- DO NOT replace or 'generalize' microeconomic case-study questions into macroeconomic essays (e.g., if the question asks about 'decreasing consumption of fast food increasing unemployment in the US', DO NOT evaluate it as 'whether unemployment is harmful to macroeconomic performance'). Grade ONLY what is written on the page.

2. NEVER PENALIZE MARK SCHEME EXEMPLARS:
- When a candidate's evaluation or explanation matches the exact points provided in the official mark scheme (e.g., in 1(b) or 1(c): 'healthy options', 'calorie labeling', 'menu reformulation', 'information failure'), award the mark immediately.
- NEVER call an official mark scheme exemplar or indicative point 'unrelated', 'detracting', or 'unnecessary'.

3. POINT-BASED VS LEVEL-BASED BOUNDARIES:
- For short-answer questions (1–5 marks): award marks strictly on the presence of mark-scheme points and logical reasoning. Do not demand extract quotes, data citations ($ figures), or externalities unless the mark scheme explicitly requires them.
- For 6-mark, 7-mark, 8-mark, and 9-mark evaluative questions (AO2 Analysis + AO3 Evaluation): match the candidate's arguments directly against the advantages/disadvantages and indicative points listed on the mark scheme before assigning the rubric level (Level 2 or Level 3/4).
  - Check for balanced analysis: at least one clear argument on each side of the debate.
  - Check for a reasoned conclusion/judgment to access top-level evaluation marks (AO3 / Level 3).
  - Credit sound, syllabus-aligned alternative economic mechanisms (e.g., substitution effects, price elasticity of demand, derived demand, indirect tax incidence, opportunity costs, multiplier effects) even if phrased differently from mark scheme exemplars, provided the logic is economically valid and directly answers the question.

4. STRICT ADHERENCE TO THE OFFICIAL MARK SCHEME (SOURCE OF TRUTH):
- Base all marks, point allocations, and answer keys EXCLUSIVELY on the uploaded/provided mark scheme and extract.
- Never penalize a candidate for omitting concepts that the mark scheme explicitly excludes or deems non-essential (e.g., do not demand externalities or third-party costs when the mark scheme states: "do not expect reference to 3rd party effects").
- Honor all official guidance ranges, acceptable values, and alternative classifications (e.g., if the MS allows a range [0.7 to 0.8] or says "allow normal good, necessity, OR inelastic YED", credit ANY of those valid options in full).
- For calculation questions, apply the Own Figure Rule (OFR) if allowed by the mark scheme.

5. CONTEXT & EXTRACT APPLICATION (AO2):
- Reward extract linkage and application when the question requires it as part of AO2 (Analysis & Application), but DO NOT fabricate non-existent data requirements.
- Distinguish between questions that explicitly require data extraction (e.g., "Using the information in paragraph 2...") and general theory/application questions where standard examples (such as mandatory calorie counts or menu reformulations) are valid.
- When the mark scheme lists illustrative points (e.g., "healthy options", "calorific content"), treat them as acceptable answers rather than penalizing candidates for not quoting unmentioned data.

6. ACCURATE AUDIT AND FEEDBACK OUTPUT:
In your assessment report, provide:
- Exact Marks Awarded vs. Maximum Marks per sub-question.
- Specific Mark Scheme Criteria Met: Explicitly quote where the candidate matched the mark scheme allowance or demonstrated correct economic reasoning.
- Constructive Feedback: Only flag omissions if a required criterion on the official mark scheme was genuinely missed. Never penalize a student based on criteria outside the syllabus or official rubric.

7. MATHEMATICAL AO RECONCILIATION & INTEGRITY (STRICT RULE):
- Cambridge IGCSE 0455 Economics has 3 Assessment Objectives: AO1 (Knowledge & Understanding), AO2 (Analysis & Application), and AO3 (Evaluation). There is NO AO4 in Cambridge IGCSE 0455; application falls under AO2 Analysis.
- The total awardedMark MUST strictly and exactly equal the sum of the awarded marks in aoBreakdown:
  awardedMark = knowledge.awarded + analysis.awarded + (evaluation.awarded if present).
- Each AO awarded score must never exceed its outOf maximum.
- For 6-mark evaluative questions scoring 5 or 6 marks (Level 3), evaluation.awarded MUST NEVER be 0 (award 1/2 or 2/2 for evaluation).

8. TABLE-BASED RELATIONSHIP QUESTIONS (e.g. 'Analyse the relationship between X and Y' from a data table):
- Stating the relationship (max 1–2 marks): Award 1 mark for stating whether it is direct/positive or inverse/negative.
- Data Evidence (max 2 marks): To earn ANY evidence marks, the candidate MUST contrast BOTH ends of the relationship (e.g., explicitly contrasting the highest GDP country with the lowest GDP country). Quoting data from only one end of the table (e.g., quoting Canada and Iceland alone without comparing them against Senegal or PNG) earns ZERO (0) evidence marks because it fails to show a trend. Never award evidence marks for one-ended citations.
- Explaining the normal relationship (max 1–2 marks): Candidate must clearly explain the causal economic mechanism (e.g. higher income enables households to afford basic necessities).
- Identifying an Exception (max 2 marks): Verify that any cited country/pair is a GENUINE mathematical reversal/exception in the table. If a candidate claims a country is an exception when its figures actually follow the general trend (e.g. claiming Romania is an exception to an inverse relationship when its lower GDP/head matches its higher poverty relative to Canada/Iceland), award ZERO (0) exception marks, and award ZERO (0) for explaining a false exception.

9. FORMATTING MANDATE (CRITICAL):
- NEVER include asterisks (* or **) or markdown bolding formatting in any feedback strings, rationales, quotes, criteria, or summaries.
- Output clean, unstarred plain text everywhere.

OUTPUT FORMAT (JSON ONLY, NO MARKDOWN FENCES, NO EXTRA TEXT):
{
  "awardedMark": <integer between 0 and maxMark>,
  "extractContextCheck": {
    "usedContext": <true or false>,
    "contextQuality": <"strong" | "adequate" | "limited" | "generic_or_missing">,
    "feedback": "<clean unstarred text evaluating extract application>"
  },
  "aoBreakdown": {
    "knowledge": { "awarded": <int>, "outOf": <int>, "comment": "<clean unstarred note on definitions, theory, and understanding>" },
    "analysis": { "awarded": <int>, "outOf": <int>, "comment": "<clean unstarred note on economic analysis and application to context/data>" },
    "evaluation": { "awarded": <int>, "outOf": <int>, "comment": "<clean unstarred note on balanced evaluation and justified judgment (0/0 if non-evaluative)>" }
  },
  "rubricLevelAwarded": {
    "level": <integer 1, 2, or 3, or null if point-based>,
    "label": "<e.g. Level 3: Effective Evaluation in Context>",
    "marksRange": "<e.g. 5–6 marks>",
    "evaluativeComment": "<clean unstarred explanation of evaluation quality and reasoned judgment>"
  },
  "diagramEvaluation": {
    "detected": <true or false>,
    "name": "<name of diagram>",
    "axesLabelledCorrectly": <true or false>,
    "curvesDrawnCorrectly": <true or false>,
    "shiftDirectionCorrect": <true or false>,
    "equilibriumLabelled": <true or false>,
    "examinerComment": "<clean unstarred comment on diagram accuracy>",
    "marksAwarded": <int>
  },
  "specificCriteriaMet": [
    {
      "criterion": "<specific official mark scheme allowance or point met>",
      "candidateEvidence": "<verbatim candidate sentence or phrasing demonstrating this>"
    }
  ],
  "examinerRationale": "<authoritative clean unstarred paragraph explaining marks strictly tied to official mark scheme>",
  "evidenceQuotes": ["<verbatim quote 1>", "<verbatim quote 2>"],
  "creditedPoints": ["<point from MS credited 1>", "<point from MS credited 2>"],
  "missingMarkSchemePoints": ["<official criterion genuinely missed (only if required by MS)>"],
  "constructiveFeedback": ["<constructive guidance only flagging genuine omissions without external rubric penalties>"],
  "modelAnswerSnippet": "<concise Cambridge exemplar snippet showing how full marks are secured>",
  "improvementTip": "<actionable advice for future questions>"
}`;

export interface ReconciledAoBreakdown {
  knowledge: { awarded: number; outOf: number; comment?: string };
  analysis: { awarded: number; outOf: number; comment?: string };
  evaluation?: { awarded: number; outOf: number; comment?: string };
  application?: { awarded: number; outOf: number; comment?: string }; // Legacy support
}

export function reconcileAoBreakdown(params: {
  awardedMark: number;
  maxMark: number;
  tariff: { ao1: number; ao2: number; ao3: number; ao4?: number };
  rawAo?: {
    knowledge?: { awarded?: number; outOf?: number; comment?: string };
    application?: { awarded?: number; outOf?: number; comment?: string };
    analysis?: { awarded?: number; outOf?: number; comment?: string };
    evaluation?: { awarded?: number; outOf?: number; comment?: string };
  };
}): { awardedMark: number; aoBreakdown: ReconciledAoBreakdown } {
  const { maxMark, tariff, rawAo } = params;
  let awarded = Math.min(maxMark, Math.max(0, Math.round(Number(params.awardedMark ?? 0))));
  if (isNaN(awarded)) awarded = 0;

  let ao1Max = Math.max(0, Number(tariff?.ao1 ?? 0));
  let ao2Max = Math.max(0, Number(tariff?.ao2 ?? 0));
  let ao3Max = Math.max(0, Number(tariff?.ao3 ?? 0));

  // If legacy tariff passed ao4 as evaluation and ao2 as application, map them properly:
  if (tariff?.ao4 !== undefined) {
    ao2Max = ao2Max + ao3Max;
    ao3Max = Number(tariff.ao4);
  }

  const hasEvaluation = ao3Max > 0 || maxMark >= 6;
  if (hasEvaluation && ao3Max === 0) {
    ao3Max = 2;
  }

  if (hasEvaluation) {
    const nonEval = Math.max(0, maxMark - ao3Max);
    if (ao1Max + ao2Max !== nonEval) {
      if (maxMark === 6) {
        ao1Max = 2;
        ao2Max = 2;
        ao3Max = 2;
      } else {
        const currentNonEval = ao1Max + ao2Max;
        if (currentNonEval === 0) {
          ao1Max = Math.ceil(nonEval / 2);
          ao2Max = nonEval - ao1Max;
        } else {
          const factor = nonEval / currentNonEval;
          ao1Max = Math.round(ao1Max * factor);
          ao2Max = Math.max(0, nonEval - ao1Max);
        }
      }
    }
  } else {
    ao3Max = 0;
    const currentSum = ao1Max + ao2Max;
    if (currentSum !== maxMark) {
      if (currentSum === 0) {
        ao1Max = Math.ceil(maxMark / 2);
        ao2Max = maxMark - ao1Max;
      } else {
        const factor = maxMark / currentSum;
        ao1Max = Math.round(ao1Max * factor);
        ao2Max = Math.max(0, maxMark - ao1Max);
      }
    }
  }

  // Parse raw awarded values clamped to their respective max
  let a1 = Math.min(ao1Max, Math.max(0, Math.round(Number(rawAo?.knowledge?.awarded ?? 0))));

  // Application comes under Analysis (AO2): combine raw analysis + application
  let rawA2 = 0;
  if (rawAo?.analysis?.awarded !== undefined && rawAo?.application?.awarded !== undefined) {
    rawA2 = Number(rawAo.analysis.awarded) + Number(rawAo.application.awarded);
  } else if (rawAo?.analysis?.awarded !== undefined) {
    rawA2 = Number(rawAo.analysis.awarded);
  } else if (rawAo?.application?.awarded !== undefined) {
    rawA2 = Number(rawAo.application.awarded);
  }
  let a2 = Math.min(ao2Max, Math.max(0, Math.round(rawA2)));

  let a3 = hasEvaluation ? Math.min(ao3Max, Math.max(0, Math.round(Number(rawAo?.evaluation?.awarded ?? 0)))) : 0;

  if (isNaN(a1)) a1 = 0;
  if (isNaN(a2)) a2 = 0;
  if (isNaN(a3)) a3 = 0;

  if (awarded === 0) {
    a1 = 0;
    a2 = 0;
    a3 = 0;
  } else {
    // Cambridge IGCSE 0455 Level 3 evaluative rule: 5 or 6 marks on a 6-mark question requires AO3 evaluation
    if (hasEvaluation && maxMark === 6) {
      if (awarded === 6 && a3 < 2) a3 = 2;
      else if (awarded === 5 && a3 < 1) a3 = 1;
    }

    let currentSum = a1 + a2 + (hasEvaluation ? a3 : 0);

    // If deficit, distribute points up to individual maxes
    if (currentSum < awarded) {
      let deficit = awarded - currentSum;

      // 1. If evaluative question and a3 has room, top up a3 if high scoring
      if (hasEvaluation && awarded >= 5 && a3 < ao3Max && deficit > 0) {
        const add = Math.min(deficit, ao3Max - a3);
        a3 += add;
        deficit -= add;
      }

      // 2. Distribute to a1, a2, then a3
      const order = hasEvaluation ? [1, 2, 3] : [1, 2];
      for (const aoIdx of order) {
        if (deficit <= 0) break;
        if (aoIdx === 1 && a1 < ao1Max) {
          const add = Math.min(deficit, ao1Max - a1);
          a1 += add;
          deficit -= add;
        } else if (aoIdx === 2 && a2 < ao2Max) {
          const add = Math.min(deficit, ao2Max - a2);
          a2 += add;
          deficit -= add;
        } else if (aoIdx === 3 && hasEvaluation && a3 < ao3Max) {
          const add = Math.min(deficit, ao3Max - a3);
          a3 += add;
          deficit -= add;
        }
      }
    } else if (currentSum > awarded) {
      // If excess, deduct points
      let excess = currentSum - awarded;
      const minA3 = (hasEvaluation && maxMark === 6 && awarded >= 5) ? (awarded === 6 ? 2 : 1) : 0;

      // Deduct from a2, a1, and finally a3 (respecting minA3)
      const deductOrder = hasEvaluation ? [2, 1, 3] : [2, 1];
      for (const aoIdx of deductOrder) {
        if (excess <= 0) break;
        if (aoIdx === 2 && a2 > 0) {
          const sub = Math.min(excess, a2);
          a2 -= sub;
          excess -= sub;
        } else if (aoIdx === 1 && a1 > 0) {
          const sub = Math.min(excess, a1);
          a1 -= sub;
          excess -= sub;
        } else if (aoIdx === 3 && hasEvaluation && a3 > minA3) {
          const sub = Math.min(excess, a3 - minA3);
          a3 -= sub;
          excess -= sub;
        }
      }
    }

    // Strict mathematical reconciliation: sum of components MUST equal awarded mark
    const finalSum = a1 + a2 + (hasEvaluation ? a3 : 0);
    if (finalSum !== awarded) {
      awarded = finalSum;
    }
  }

  const aoBreakdown: ReconciledAoBreakdown = {
    knowledge: {
      awarded: a1,
      outOf: ao1Max,
      comment: rawAo?.knowledge?.comment ? stripStars(rawAo.knowledge.comment) : undefined,
    },
    analysis: {
      awarded: a2,
      outOf: ao2Max,
      comment: rawAo?.analysis?.comment
        ? stripStars(rawAo.analysis.comment)
        : rawAo?.application?.comment
        ? stripStars(rawAo.application.comment)
        : undefined,
    },
    ...(hasEvaluation && ao3Max > 0
      ? {
          evaluation: {
            awarded: a3,
            outOf: ao3Max,
            comment: rawAo?.evaluation?.comment ? stripStars(rawAo.evaluation.comment) : undefined,
          },
        }
      : {}),
  };

  return { awardedMark: awarded, aoBreakdown };
}

export async function markDataResponseQuestion(params: {
  extract: DataResponseExtract;
  question: DataResponseQuestion;
  studentAnswer: string;
}): Promise<QuestionEvaluationResult> {
  const { extract, question, studentAnswer } = params;

  // Handle blank or negligible answer
  if (!studentAnswer || studentAnswer.trim().length < 4) {
    const { aoBreakdown: blankAo } = reconcileAoBreakdown({
      awardedMark: 0,
      maxMark: question.maxMark,
      tariff: question.tariff,
    });
    return cleanStars({
      questionNumber: question.number,
      questionTitle: question.title,
      maxMark: question.maxMark,
      awardedMark: 0,
      category: question.category,
      extractContextCheck: {
        usedContext: false,
        contextQuality: "generic_or_missing",
        feedback: "No answer was provided for this question.",
      },
      aoBreakdown: blankAo,
      rubricLevelAwarded: question.maxMark >= 6
        ? { level: 0, label: "No Creditable Response", marksRange: "0 marks", evaluativeComment: "Blank submission." }
        : undefined,
      diagramEvaluation: question.hasDiagramRequirement
        ? {
            detected: false,
            axesLabelledCorrectly: false,
            curvesDrawnCorrectly: false,
            shiftDirectionCorrect: false,
            equilibriumLabelled: false,
            examinerComment: "Expected economic diagram was omitted.",
            marksAwarded: 0,
          }
        : undefined,
      specificCriteriaMet: [],
      examinerRationale: "Candidate left this question blank or provided an uncreditable fragment (0 marks).",
      evidenceQuotes: [],
      creditedPoints: [],
      missingMarkSchemePoints: question.indicativePoints || ["Complete response adhering to the mark scheme."],
      constructiveFeedback: ["Candidate did not provide a creditable attempt for this sub-question."],
      modelAnswerSnippet: "Provide a complete answer addressing the prompt with direct reference to the case study.",
      improvementTip: "Always attempt every sub-question. Even partial definitions or references to extract data can earn credit.",
    });
  }

  const prompt = `
CASE STUDY EXTRACT:
Title: ${extract.title}
${extract.paragraphs.map((p, i) => `[Para ${i + 1}] ${p}`).join("\n\n")}
${extract.tables && extract.tables.length > 0 ? `\nDATA TABLES FROM PAPER:\n${JSON.stringify(extract.tables, null, 2)}` : ""}

QUESTION DETAILS:
Question Number: ${question.number}
Question Text: ${question.title}
Max Marks: ${question.maxMark}
Category: ${question.category}
Tariff: AO1 (Knowledge & Understanding): ${question.tariff.ao1}, AO2 (Analysis & Application): ${question.tariff.ao2}${question.tariff.ao3 || question.maxMark >= 6 ? `, AO3 (Evaluation): ${question.tariff.ao3 || (question.maxMark >= 6 ? 2 : 0)}` : ""} (Note: Cambridge IGCSE 0455 Section A has 3 AOs: AO1, AO2, AO3. Application is under AO2 Analysis. Sum of AO awarded marks MUST strictly and exactly equal awardedMark).
Diagram Expected: ${question.hasDiagramRequirement ? `YES (Diagram required or credited: ${question.diagramGuidance?.diagramName || "Standard Diagram"})` : "No"}
${question.diagramGuidance ? `Diagram Guidance:\n${JSON.stringify(question.diagramGuidance, null, 2)}` : ""}
Extract Linkage Expected: ${question.extractLinkageExpected ? "YES - Answer MUST relate directly to the extract" : "General / Theory"}

OFFICIAL Cambridge IGCSE 0455 MARK SCHEME:
${question.markingGuide}

${question.indicativePoints && question.indicativePoints.length > 0 ? `INDICATIVE CONTENT IN MARK SCHEME:\n- ${question.indicativePoints.join("\n- ")}` : ""}

${question.calculationGuidance ? `CALCULATION GUIDANCE & STEPS:\n${JSON.stringify(question.calculationGuidance, null, 2)}` : ""}

${question.rubricLevels && question.rubricLevels.length > 0 ? `EXACT MARK SCHEME RUBRIC LEVELS (CRUCIAL FOR 6+ MARKS):\n${JSON.stringify(question.rubricLevels, null, 2)}` : ""}

CANDIDATE'S WRITTEN RESPONSE:
"""
${studentAnswer}
"""
`.trim();

  try {
    let aiResponse: any = null;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        aiResponse = await chat({
          model: MODEL_EXAMINER,
          temperature: 0.1,
          json: true,
          messages: [
            { role: "system", content: DATA_RESPONSE_MARKING_SYSTEM },
            { role: "user", content: prompt },
          ],
          maxCompletionTokens: 2500,
        });
        if (aiResponse?.text) break;
      } catch (err) {
        lastError = err;
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }

    if (!aiResponse?.text) {
      console.error(`Error marking question ${question.number}:`, lastError);
      throw new Error(
        `Examiner marking service unavailable for question ${question.number}: ${
          lastError instanceof Error ? lastError.message : "AI model timed out or rate-limited"
        }. Please retry marking.`,
      );
    }

    let raw: any = {};
    try {
      raw = JSON.parse(aiResponse.text);
    } catch {
      raw = {};
    }

    // Invariant validation & AO reconciliation: guarantees sum(AO) === awardedMark strictly
    const { awardedMark: reconciledAwarded, aoBreakdown: reconciledAo } = reconcileAoBreakdown({
      awardedMark: typeof raw.awardedMark === "number" ? raw.awardedMark : 0,
      maxMark: question.maxMark,
      tariff: question.tariff,
      rawAo: raw.aoBreakdown,
    });
    const awarded = reconciledAwarded;

    let diagramEval: DiagramEvaluationResult | undefined = undefined;
    if (question.hasDiagramRequirement) {
      const rawDiag = raw.diagramEvaluation || {};
      diagramEval = {
        detected: Boolean(rawDiag.detected),
        name: rawDiag.name || question.diagramGuidance?.diagramName || "Economics Diagram",
        axesLabelledCorrectly: Boolean(rawDiag.axesLabelledCorrectly),
        curvesDrawnCorrectly: Boolean(rawDiag.curvesDrawnCorrectly),
        shiftDirectionCorrect: Boolean(rawDiag.shiftDirectionCorrect),
        equilibriumLabelled: Boolean(rawDiag.equilibriumLabelled),
        examinerComment: String(rawDiag.examinerComment || (rawDiag.detected ? "Diagram correctly represented." : "Diagram description/shift missing or incomplete.")),
        marksAwarded: Math.min(question.diagramGuidance?.marksAllocated || 2, Math.max(0, Number(rawDiag.marksAwarded ?? (rawDiag.detected ? 2 : 0)))),
      };
    }

    // Specific mark scheme criteria met
    let specificCriteriaMet: Array<{ criterion: string; candidateEvidence?: string }> = [];
    if (Array.isArray(raw.specificCriteriaMet) && raw.specificCriteriaMet.length > 0) {
      specificCriteriaMet = raw.specificCriteriaMet
        .filter((item: any) => item && (typeof item === "string" || item.criterion))
        .map((item: any) => ({
          criterion: stripStars(typeof item === "string" ? item : item.criterion),
          candidateEvidence: item.candidateEvidence ? stripStars(item.candidateEvidence) : undefined,
        }));
    } else if (Array.isArray(raw.creditedPoints) && raw.creditedPoints.length > 0) {
      specificCriteriaMet = raw.creditedPoints
        .filter((p: any) => typeof p === "string" && p.length > 0)
        .map((p: any) => ({
          criterion: stripStars(p),
          candidateEvidence: undefined,
        }));
    }

    // Constructive feedback strictly tied to mark scheme omissions
    let constructiveFeedback: string[] = [];
    if (Array.isArray(raw.constructiveFeedback) && raw.constructiveFeedback.length > 0) {
      constructiveFeedback = raw.constructiveFeedback
        .filter((f: any) => typeof f === "string" && f.length > 0)
        .map((f: any) => stripStars(f));
    } else if (Array.isArray(raw.missingMarkSchemePoints) && raw.missingMarkSchemePoints.length > 0) {
      constructiveFeedback = raw.missingMarkSchemePoints
        .filter((m: any) => typeof m === "string" && m.length > 0)
        .map((m: any) => stripStars(m));
    }

    const evaluationResult: QuestionEvaluationResult = cleanStars({
      questionNumber: question.number,
      questionTitle: question.title,
      maxMark: question.maxMark,
      awardedMark: awarded,
      category: question.category,
      extractContextCheck: {
        usedContext: Boolean(raw.extractContextCheck?.usedContext ?? true),
        contextQuality: raw.extractContextCheck?.contextQuality || "adequate",
        feedback: stripStars(raw.extractContextCheck?.feedback || "Evaluation of extract relevance completed."),
      },
      aoBreakdown: reconciledAo,
      rubricLevelAwarded: raw.rubricLevelAwarded && raw.rubricLevelAwarded.level ? {
        level: Number(raw.rubricLevelAwarded.level),
        label: stripStars(String(raw.rubricLevelAwarded.label || `Level ${raw.rubricLevelAwarded.level}`)),
        marksRange: stripStars(String(raw.rubricLevelAwarded.marksRange || `${awarded}/${question.maxMark}`)),
        evaluativeComment: raw.rubricLevelAwarded.evaluativeComment ? stripStars(raw.rubricLevelAwarded.evaluativeComment) : undefined,
      } : undefined,
      diagramEvaluation: diagramEval,
      specificCriteriaMet,
      examinerRationale: stripStars(raw.examinerRationale || `Awarded ${awarded}/${question.maxMark} marks according to Cambridge IGCSE 0455 mark scheme criteria.`),
      evidenceQuotes: Array.isArray(raw.evidenceQuotes) ? raw.evidenceQuotes.filter((q: any) => typeof q === "string" && q.length > 0).map((q: string) => stripStars(q)) : [],
      creditedPoints: Array.isArray(raw.creditedPoints) ? raw.creditedPoints.filter((p: any) => typeof p === "string" && p.length > 0).map((p: string) => stripStars(p)) : [],
      missingMarkSchemePoints: Array.isArray(raw.missingMarkSchemePoints) ? raw.missingMarkSchemePoints.filter((m: any) => typeof m === "string" && m.length > 0).map((m: string) => stripStars(m)) : [],
      constructiveFeedback,
      modelAnswerSnippet: stripStars(raw.modelAnswerSnippet || "Consult the official mark scheme points."),
      improvementTip: stripStars(raw.improvementTip || "Ensure all points are tied directly to data from the extract and tables."),
    });

    return evaluationResult;
  } catch (error) {
    console.error(`Error marking question ${question.number}:`, error);
    throw error instanceof Error
      ? error
      : new Error(`Marking failed for question ${question.number}. Please retry.`);
  }
}

export async function gradeFullDataResponsePaper(params: {
  paper: DataResponsePaper;
  answers: Record<string, string>; // questionId or questionNumber -> text
  candidateName?: string;
}): Promise<DataResponseSubmissionResult> {
  const { paper, answers, candidateName } = params;

  const questionResults: Record<string, QuestionEvaluationResult> = {};
  let totalAwarded = 0;
  let maxTotal = 0;

  for (const question of paper.questions) {
    maxTotal += question.maxMark;
    const studentText = answers[question.number] || answers[question.id] || "";
    const result = await markDataResponseQuestion({
      extract: paper.extract,
      question,
      studentAnswer: studentText,
    });
    questionResults[question.number] = result;
    totalAwarded += result.awardedMark;
  }

  const percentage = maxTotal > 0 ? Math.round((totalAwarded / maxTotal) * 100) : 0;
  let overallBand = "Band C (Solid Pass)";
  if (percentage >= 80) overallBand = "Band A* (Outstanding / Top Band)";
  else if (percentage >= 70) overallBand = "Band A (Excellent Performance)";
  else if (percentage >= 60) overallBand = "Band B (Good Analysis)";
  else if (percentage >= 50) overallBand = "Band C (Satisfactory)";
  else if (percentage >= 40) overallBand = "Band D (Basic / Needs Work)";
  else overallBand = "Band U (Unclassified)";

  const executiveSummary = stripStars(
    `Candidate scored ${totalAwarded}/${maxTotal} marks (${percentage}%, ${overallBand}) on ${paper.title}. Marking conducted strictly in accordance with official Cambridge ${paper.subjectCode} mark scheme guidelines, assessing extract application, table calculations with OFR, diagram accuracy, and evaluative rubric criteria for 6+ mark questions.`
  );

  return cleanStars({
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    paperId: paper.id,
    paperTitle: paper.title,
    subjectCode: paper.subjectCode,
    totalMarksAwarded: totalAwarded,
    maxTotalMarks: maxTotal,
    percentage,
    overallBand,
    examinerExecutiveSummary: executiveSummary,
    questionResults,
    submittedAt: new Date().toISOString(),
  });
}
