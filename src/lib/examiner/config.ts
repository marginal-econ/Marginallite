/**
 * Cambridge IGCSE Economics (0455) Marking Configuration.
 * Derived from the official Cambridge IGCSE 0455 Syllabus and Mark Schemes.
 */

export const SYLLABUS_CODE = "0455";

export const DEFAULT_MAX_MARK = 8;

export type AoSplit = { ao1_marks: number; ao2_marks: number; ao3_marks: number };

/**
 * Authoritative Cambridge IGCSE 0455 Assessment Objectives.
 */
export const AO_DEFINITIONS = {
  ao1: {
    code: "AO1",
    name: "Knowledge and understanding",
    description: "accurate economic definitions, formulas, concepts, theories, and terminology",
  },
  ao2: {
    code: "AO2",
    name: "Analysis",
    description:
      "chains of economic reasoning: select, organise, apply data/diagrams, and develop causes and consequences",
  },
  ao3: {
    code: "AO3",
    name: "Evaluation",
    description:
      "balanced discussions, weighing different sides, assessing uncertainties of outcomes, and justified conclusions",
  },
} as const;

export type AoKey = keyof typeof AO_DEFINITIONS;

export function formatAoLine(key: AoKey): string {
  const ao = AO_DEFINITIONS[key];
  return `${ao.code} ${ao.name} (${ao.description})`;
}

export function renderAoDefinitions(): string {
  return (["ao1", "ao2", "ao3"] as AoKey[]).map((key) => `- ${formatAoLine(key)}`).join("\n");
}

/** Balanced dual-pass temperatures: Pass 1 at 0.0 for analytical precision; Pass 2 at 0.2 for holistic evaluation. */
export const TEMPERATURE_PASS1 = 0.0;
export const TEMPERATURE_PASS2 = 0.2;
export const TEMPERATURE_EXAMINER = 0.0;
export const TEMPERATURE_TUTOR = 0.4;
export const MAX_ANCHORS_PER_BAND = 2;

export const MODEL_EXAMINER = "google/gemini-3.8-flash";
export const MODEL_FAST = "google/gemini-3.8-flash";

export const MODEL_GRADING = MODEL_EXAMINER;
export const MODEL_AUDIT = MODEL_EXAMINER;
export const MODEL_ARBITRATION = MODEL_EXAMINER;
export const MODEL_ESSAY_GEN = MODEL_EXAMINER;

export const MODEL_COACH = MODEL_FAST;
export const MODEL_ANALYSIS = MODEL_FAST;
export const MODEL_CHALLENGE = MODEL_FAST;
export const MODEL_QUESTION_GEN = MODEL_FAST;
export const MODEL_EXTRACT = MODEL_FAST;
export const MODEL_ESTIMATE = MODEL_FAST;
export const MODEL_MECHANICAL = MODEL_FAST;

export const MODEL_EMBEDDING = "google/gemini-embedding-2";
export const EMBEDDING_DIMS = 2048;

/**
 * Checks whether a question requires evaluation (AO3).
 * In Cambridge IGCSE 0455, "Discuss whether or not...", "Discuss...", "Evaluate...",
 * "Assess...", "Consider whether..." require balanced two-sided evaluation.
 */
export function isEvaluativeQuestion(question?: string | null): boolean {
  if (!question || typeof question !== "string") return false;
  return /\b(discuss|evaluate|assess|whether\s+or\s+not|whether|to\s+what\s+extent|consider\s+whether|justify|should)\b/i.test(
    question,
  );
}

/**
 * Authoritative Cambridge IGCSE 0455 Question Tariffs.
 * Derived directly from 0455 Paper 2 Mark Schemes.
 */
export const TARIFF_SPLITS: Record<number, AoSplit> = {
  1: { ao1_marks: 1, ao2_marks: 0, ao3_marks: 0 },
  2: { ao1_marks: 2, ao2_marks: 0, ao3_marks: 0 },
  4: { ao1_marks: 2, ao2_marks: 2, ao3_marks: 0 },
  5: { ao1_marks: 1, ao2_marks: 4, ao3_marks: 0 },
  6: { ao1_marks: 0, ao2_marks: 6, ao3_marks: 0 },
  8: { ao1_marks: 2, ao2_marks: 3, ao3_marks: 3 },
  10: { ao1_marks: 2, ao2_marks: 4, ao3_marks: 4 },
  12: { ao1_marks: 2, ao2_marks: 6, ao3_marks: 4 },
  20: { ao1_marks: 4, ao2_marks: 10, ao3_marks: 6 },
};

/**
 * Determine AO split based on mark value, command word, or question prompt.
 */
export function defaultSplitForMaxMark(
  maxMark: number,
  commandWord?: string,
  question?: string,
): AoSplit {
  const numericMax =
    typeof maxMark === "number" && Number.isFinite(maxMark) && maxMark > 0
      ? maxMark
      : Number.isFinite(Number(maxMark)) && Number(maxMark) > 0
        ? Number(maxMark)
        : DEFAULT_MAX_MARK;

  const cmd = commandWord?.toLowerCase().trim();

  // Section A 6-mark Discuss / Evaluate question (e.g. Q1g / Q1h)
  if (
    numericMax === 6 &&
    (cmd === "discuss" ||
      cmd === "evaluate" ||
      cmd === "6_discuss" ||
      (!cmd && question && isEvaluativeQuestion(question)))
  ) {
    return { ao1_marks: 2, ao2_marks: 2, ao3_marks: 2 };
  }

  // Standard 6-mark Analyse question in Cambridge 0455 is pure AO2 Analysis
  if (numericMax === 6) {
    return { ao1_marks: 0, ao2_marks: 6, ao3_marks: 0 };
  }

  const exact = TARIFF_SPLITS[numericMax];
  if (exact) return { ...exact };

  if (numericMax <= 2) {
    return { ao1_marks: numericMax, ao2_marks: 0, ao3_marks: 0 };
  }
  if (numericMax < 6) {
    const ao1 = 2;
    return { ao1_marks: ao1, ao2_marks: numericMax - ao1, ao3_marks: 0 };
  }

  const ao1 = Math.max(1, Math.round(numericMax * 0.25));
  const ao3 = Math.max(1, Math.round(numericMax * 0.35));
  const ao2 = numericMax - ao1 - ao3;
  return { ao1_marks: ao1, ao2_marks: ao2, ao3_marks: ao3 };
}

export function aoMaxMarks(maxMark: number): { ao1: number; ao2: number; ao3: number } {
  const split = defaultSplitForMaxMark(maxMark);
  return { ao1: split.ao1_marks, ao2: split.ao2_marks, ao3: split.ao3_marks };
}

/**
 * Builds the authoritative Cambridge IGCSE 0455 directive for evaluation based on tariff.
 */
export function buildAoEvaluationDirective(
  maxMark: number,
  split: AoSplit,
  isDiagram?: boolean,
): string {
  if (split.ao3_marks === 0) {
    if (maxMark <= 2) {
      return `SPECIAL DIRECTIVE FOR CAMBRIDGE IGCSE 0455 ${maxMark}-MARK DEFINE / IDENTIFY / CALCULATE QUESTIONS (AO1: ${split.ao1_marks}, AO2: 0, AO3: 0):
- Pure point-marked knowledge/identification/calculation question.
- Award 1 mark per accurate syllabus component or identified factor up to ${maxMark} marks.
- EVALUATION AND EXTENDED ANALYSIS ARE STRICTLY NOT REQUIRED. Never penalise brevity when the exact economic definition or calculation is accurate.
- Set "ao_breakdown.evaluation" to { "awarded": 0, "out_of": 0, "comment": "Evaluation is not required for this question." } and keep "missing_elements.evaluation" empty [].`;
    }
    if (maxMark === 4) {
      return `SPECIAL DIRECTIVE FOR CAMBRIDGE IGCSE 0455 4-MARK EXPLAIN QUESTIONS (AO1: 2, AO2: 2, AO3: 0):
- Point-marked: 2 distinct points × 2 marks each (1 mark for valid identification + 1 mark for logical economic explanation/consequence).
- EVALUATION IS STRICTLY NOT REQUIRED. Never penalise for missing counter-arguments or conclusions.
- Set "ao_breakdown.evaluation" to { "awarded": 0, "out_of": 0, "comment": "Evaluation is not required for a 4-mark Explain question." } and keep "missing_elements.evaluation" empty [].`;
    }
    if (maxMark === 6 && isDiagram) {
      return `SPECIAL DIRECTIVE FOR CAMBRIDGE IGCSE 0455 6-MARK DIAGRAM ANALYSIS QUESTIONS (AO1: 0, AO2: 6, AO3: 0):
- Pure AO2 Analysis: 4 marks for the technical diagram (1m axes P/Q, 1m original curves & equilibrium, 1m correct curve shift with arrow/label, 1m new equilibrium P2/Q2) + 2 marks for written explanation (1m cause of shift, 1m market outcome on equilibrium price & quantity).
- EVALUATION IS STRICTLY NOT REQUIRED. Set "ao_breakdown.knowledge" and "ao_breakdown.evaluation" awarded: 0, out_of: 0.`;
    }
    return `SPECIAL DIRECTIVE FOR CAMBRIDGE IGCSE 0455 ${maxMark}-MARK NON-EVALUATIVE ANALYSIS QUESTIONS (AO1: ${split.ao1_marks}, AO2: ${split.ao2_marks}, AO3: 0):
- Pure explanation/analysis question (e.g. 6-mark 'Analyse' in Section B Part c).
- EVALUATION IS STRICTLY NOT REQUIRED. Candidates MUST NOT be penalised for omitting counter-arguments or conclusions.
- Official 0455 Cap: On 6-mark 'Analyse' questions, merely listing points without causal development is capped at a MAXIMUM of 3 marks.
- Set "ao_breakdown.evaluation" to { "awarded": 0, "out_of": 0, "comment": "Evaluation is not required for this question. No marks are lost for its omission." } and keep "missing_elements.evaluation" empty [].`;
  }

  if (maxMark === 6 && split.ao3_marks === 2) {
    return `SPECIAL DIRECTIVE FOR CAMBRIDGE IGCSE 0455 SECTION A 6-MARK DISCUSS QUESTIONS (AO1: 2, AO2: 2, AO3: 2):
- Up to 4 marks for logical reasons on one side ('why it might') and up to 4 marks for logical reasons on the other side ('why it might not'), capped at 6 marks total.
- Balanced two-sided discussion with clear economic links earns full 6/6 marks. One-sided answers are capped at max 4/6.`;
  }

  if (maxMark === 8) {
    return `SPECIAL DIRECTIVE FOR CAMBRIDGE IGCSE 0455 8-MARK DISCUSS QUESTIONS (AO1: ${split.ao1_marks}, AO2: ${split.ao2_marks}, AO3: ${split.ao3_marks}):
- Marked using Official Cambridge 0455 Table A Levels of Response (Levels 1–3):
  * Level 3 (6–8 marks): Reasoned discussion accurately examining BOTH sides of the economic argument, applying clear logical analysis, and providing thoughtful evaluation of uncertainties/conditions and a reasoned verdict.
  * Level 2 (3–5 marks): Reasoned discussion making use of economic information and clear analysis, but may lack depth or be one-sided (one-sided responses are capped in Level 2, max 5/8).
  * Level 1 (1–2 marks): Simple attempt using economic definitions/terminology with occasional understanding.
- EVALUATION IS MANDATORY. Grade AO3 out of exactly ${split.ao3_marks} marks.`;
  }

  return `SPECIAL DIRECTIVE FOR EVALUATIVE IGCSE 0455 RESPONSES (${maxMark} marks: AO1: ${split.ao1_marks}, AO2: ${split.ao2_marks}, AO3: ${split.ao3_marks}):
- EVALUATION IS MANDATORY. Examine both sides of the argument, weigh uncertainties/trade-offs, and reach a reasoned conclusion.`;
}

/**
 * Renders syllabus-exact AO3 level descriptors matching the IGCSE 0455 tariff.
 */
export function renderAo3Descriptors(maxMark: number, ao3Marks: number): string {
  if (ao3Marks === 0) {
    return `- AO3 Evaluation (0 marks): Evaluation is NOT required for this ${maxMark}-mark IGCSE 0455 question. Never penalise candidates for omitting evaluation or conclusions.`;
  }
  if (maxMark === 6 && ao3Marks === 2) {
    return `- AO3 Evaluation (${ao3Marks} marks) — IGCSE 0455 Section A 6-Mark Discuss:
      * 2 of 2: Clear two-sided discussion weighing reasons why it might and why it might not, linked to the extract/context.
      * 1 of 2: Brief second side or undeveloped evaluative comment.
      * 0 of 2: Strictly one-sided answer with no counter-perspective.`;
  }
  if (maxMark === 8) {
    return `- AO3 Evaluation (${ao3Marks} marks) — IGCSE 0455 Section B 8-Mark Discuss (Table A):
      * Level 3 (${ao3Marks} of ${ao3Marks}): Balanced two-sided discussion with thoughtful evaluative judgement (weighing short run vs long run, elasticity, scale, or stakeholder impacts) and a reasoned conclusion directly answering 'whether or not'.
      * Level 2 (${Math.max(1, ao3Marks - 1)} of ${ao3Marks}): Both sides addressed with some evaluative comment, or a conclusion that summarises rather than weighs decisive factors.
      * Level 1 (1 of ${ao3Marks}): Minimal counter-argument or unsupported assertion.
      * Level 0 (0 of ${ao3Marks}): Strictly one-sided description with zero evaluative weighing.`;
  }
  return `- AO3 Evaluation (${ao3Marks} marks): Assess balanced two-sided discussion, weighing of uncertainties/trade-offs, and justified conclusion out of ${ao3Marks} marks.`;
}

export type StructureStep = { title: string; detail: string };

export type StructureGuidance = {
  tariff: number;
  label: string;
  questionType: string;
  aoSummary: string;
  steps: StructureStep[];
  note: string;
};

export const STRUCTURE_GUIDANCE_DIAGRAM_6: StructureGuidance = {
  tariff: 6,
  label: "6-mark Diagram Analysis (Analyse with Diagram)",
  questionType: "4 marks for technical diagram + 2 marks for written analytical reasoning.",
  aoSummary: "Diagram: 4 marks · Written Reasoning: 2 marks · Total: 6 marks (Pure AO2 Analysis)",
  steps: [
    {
      title: "Diagram Component 1: Axes (1 mark)",
      detail: "Correctly label vertical axis 'Price' (or 'P') and horizontal axis 'Quantity' (or 'Q').",
    },
    {
      title: "Diagram Component 2: Original Curves & Equilibrium (1 mark)",
      detail: "Draw and label original curves (D and S or D1 and S1) with original equilibrium price and quantity (P1, Q1).",
    },
    {
      title: "Diagram Component 3: Curve Shift (1 mark)",
      detail: "Shift the appropriate curve in the correct direction with an arrow and new label (e.g., D2 or S2).",
    },
    {
      title: "Diagram Component 4: New Equilibrium (1 mark)",
      detail: "Correctly identify new equilibrium price and quantity dashed to axes (P2, Q2).",
    },
    {
      title: "Written Reasoning Point 1: Cause of Shift (1 mark)",
      detail: "Explain the economic cause/determinant leading to the shift in demand or supply.",
    },
    {
      title: "Written Reasoning Point 2: Market Outcome (1 mark)",
      detail: "Explain the resulting market outcome on equilibrium price and quantity.",
    },
  ],
  note: "Both technical diagram execution (4 marks) and written analytical reasoning (2 marks) are required for full marks.",
};

export const STRUCTURE_GUIDANCE: Record<number, StructureGuidance> = {
  2: {
    tariff: 2,
    label: "2-mark question (State / Define / Calculate)",
    questionType: "Short definition, calculation, or dual-identification.",
    aoSummary: "AO1 Knowledge: 2 marks",
    steps: [
      {
        title: "Point 1 (1 mark)",
        detail: "State the primary economic feature or accurate definition stem (e.g., 'non-rival').",
      },
      {
        title: "Point 2 (1 mark)",
        detail: "Provide the second feature, accurate formula, or specific economic example.",
      },
    ],
    note: "Be concise. Full credit is awarded for exact definitions or accurate formula recall.",
  },
  4: {
    tariff: 4,
    label: "4-mark question (Explain / Analyse)",
    questionType: "Two developed points of explanation (2 developed points × 2 marks).",
    aoSummary: "AO1 Knowledge: 2 marks · AO2 Analysis: 2 marks",
    steps: [
      {
        title: "First developed point (2 marks)",
        detail: "Identify a valid economic reason/factor (1 mark) and explain the mechanism/consequence (1 mark).",
      },
      {
        title: "Second developed point (2 marks)",
        detail: "Identify a second distinct reason/factor (1 mark) and develop its economic consequence (1 mark).",
      },
    ],
    note: "Do not repeat the same point in different words. Each point must have a distinct cause and effect.",
  },
  6: {
    tariff: 6,
    label: "6-mark question (Analyse)",
    questionType: "Pure AO2 Analysis: 3 developed points (3 × 2m) OR 2 in-depth analytical causal chains (2 × 3m).",
    aoSummary: "AO1 Knowledge: 0 marks · AO2 Analysis: 6 marks · AO3: 0 marks",
    steps: [
      {
        title: "Approach A: 3 Developed Analysis Points (3 × 2 marks = 6 marks)",
        detail: "Identify factor/cause (1 mark) + develop economic mechanism and consequence (1 mark) for each of 3 distinct points.",
      },
      {
        title: "Approach B: 2 In-depth Multi-link Chains (2 × 3 marks = 6 marks)",
        detail: "Identify factor (1 mark) + analyse intermediate transmission mechanism (1 mark) + analyse downstream economic consequence (1 mark) for each of 2 points.",
      },
      {
        title: "Pure AO2 Analysis Rule",
        detail: "Zero marks are allocated for isolated definitions or knowledge statements. All marks are awarded for analytical links.",
      },
    ],
    note: "Listing points without economic development is strictly capped at maximum 3 marks by Cambridge mark schemes.",
  },
  8: {
    tariff: 8,
    label: "8-mark evaluative essay (Discuss)",
    questionType: "Levels-based discussion with two-sided analysis and reasoned evaluation.",
    aoSummary: "AO1 Knowledge: 2 marks · AO2 Analysis: 3 marks · AO3 Evaluation: 3 marks",
    steps: [
      {
        title: "Side 1 Analysis (Why it might / Advantages)",
        detail: "Develop 2 logical economic arguments supporting one side of the discussion using economic terminology.",
      },
      {
        title: "Side 2 Analysis (Why it might not / Disadvantages)",
        detail: "Develop 2 counter-arguments or opposing economic factors with clear causal mechanisms.",
      },
      {
        title: "Evaluation & Reasoned Conclusion (AO3)",
        detail: "Weigh short-run vs long-run effects, dependencies on economic conditions (e.g., PED, budget size), and reach a justified conclusion.",
      },
    ],
    note: "Level 3 (6–8 marks) requires a reasoned discussion examining both sides with thoughtful evaluation and uncertainty consideration.",
  },
};

export function getStructureGuidance(
  maxMark: number,
  split?: AoSplit,
  isDiagram?: boolean,
): StructureGuidance {
  if (maxMark === 6 && isDiagram) {
    return STRUCTURE_GUIDANCE_DIAGRAM_6;
  }

  return (
    STRUCTURE_GUIDANCE[maxMark] ?? {
      tariff: maxMark,
      label: `${maxMark}-mark question`,
      questionType: "Structured response calibrated to Cambridge IGCSE 0455.",
      aoSummary: `AO1: ${split?.ao1_marks ?? 2} · AO2: ${split?.ao2_marks ?? 3} · AO3: ${split?.ao3_marks ?? 3}`,
      steps: [
        {
          title: "Economic knowledge & analysis",
          detail: "Accurately apply relevant economic theory and causal mechanisms.",
        },
        {
          title: "Balanced evaluation & conclusion",
          detail: "Where required by 'discuss', evaluate both sides and provide a reasoned conclusion.",
        },
      ],
      note: "Answer all parts thoroughly following Cambridge 0455 mark scheme principles.",
    }
  );
}

export function formatStructureNote(guidance: StructureGuidance): string {
  return (
    `Target structure for ${guidance.label} (${guidance.aoSummary}):\n` +
    guidance.steps.map((s, i) => `${i + 1}. ${s.title}: ${s.detail}`).join("\n") +
    `\nNote: ${guidance.note}`
  );
}

/**
 * The 17 Canonical Cambridge IGCSE 0455 Syllabus Units.
 * All suggested_resources, topic citations, and feedback must align to these exact units.
 */
export const CAMBRIDGE_0455_CANONICAL_SYLLABUS = [
  { unit: "1.1", title: "The nature of the economic problem" },
  { unit: "2.7", title: "Price elasticity of demand (PED)" },
  { unit: "2.8", title: "Price elasticity of supply (PES)" },
  { unit: "2.11", title: "Market failure and government intervention" },
  { unit: "3.3", title: "Workers" },
  { unit: "4.2", title: "Macroeconomic aims of government" },
  { unit: "4.3", title: "Fiscal policy" },
  { unit: "4.4", title: "Monetary policy" },
  { unit: "4.5", title: "Supply-side policy" },
  { unit: "4.6", title: "Economic growth" },
  { unit: "4.7", title: "Employment and unemployment" },
  { unit: "4.8", title: "Inflation and deflation" },
  { unit: "5.2", title: "Poverty" },
  { unit: "6.1", title: "International specialisation" },
  { unit: "6.2", title: "Globalisation, free trade and protection" },
  { unit: "6.3", title: "Foreign exchange rates" },
  { unit: "6.4", title: "Current account of balance of payments" },
] as const;

export function formatCanonicalSyllabusPrompt(): string {
  return [
    "AUTHORITATIVE CAMBRIDGE IGCSE 0455 SYLLABUS UNITS (CITE ONLY THESE):",
    ...CAMBRIDGE_0455_CANONICAL_SYLLABUS.map(
      (s) => `- Unit ${s.unit}: ${s.title} (Cite: "Cambridge IGCSE 0455 Unit ${s.unit}: ${s.title}")`,
    ),
  ].join("\n");
}

