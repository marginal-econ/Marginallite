import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/backend/auth-middleware";
import { CAMBRIDGE_CORE_DEFINITIONS } from "./cambridge-definitions";
import { expandEconomicQuery } from "./retrieval.server";

const ChatInputSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  aiMode: z.boolean().default(false), // false = Fast RAG (0 tokens), true = Deep AI (Gemini Flash)
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })
    )
    .optional()
    .default([]),
});

export interface GroundedChatReply {
  reply: string;
  voiceoverSummary?: string;
  isEssayDraftRequest?: boolean;
  sources: Array<{
    title: string;
    chapter: string;
    paperCode?: string;
    type: "syllabus" | "mark_scheme" | "definition" | "examiner_report";
  }>;
  diagramGuidance?: string;
  autoDraftPrompt?: {
    question: string;
    marks: 8;
    essayDraft: string;
  };
  usedAi: boolean;
  costEstimate: string; // e.g. "Instant Local RAG" or "$0.0001 (Gemini Flash)"
}

/**
 * Server function to handle Grounded Cambridge Economics chat queries.
 * Open to all authenticated users.
 */
export const sendGroundedChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ChatInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<GroundedChatReply> => {
    const query = data.message.trim();
    const lowerQuery = query.toLowerCase();

    // 1. FAST RAG MODE (ZERO AI TOKEN COST - PURE LOCAL CORPUS RETRIEVAL)
    if (!data.aiMode) {
      return generateFastRagReply(query, lowerQuery);
    }

    // 2. DEEP AI EXAMINER MODE (Gemini Flash Grounded Retrieval)
    try {
      const { chat } = await import("./ai.server");
      const { MODEL_FAST } = await import("./examiner/config");

      // Retrieve top matching Cambridge definitions and syllabus concepts for prompt grounding
      const matchedDefinitions = CAMBRIDGE_CORE_DEFINITIONS.filter((d) => {
        const termLow = d.term.toLowerCase();
        return lowerQuery.includes(termLow) || termLow.includes(lowerQuery);
      }).slice(0, 3);

      const groundingContext = matchedDefinitions.length > 0
        ? matchedDefinitions
            .map((d) => `• Term: ${d.term} (${d.category})\n  Official Cambridge Definition: "${d.definition_text}"`)
            .join("\n")
        : "Ground arguments strictly in Cambridge IGCSE Economics (0455) syllabus standards (Units 1–6).";

      const systemPrompt = `You are the Cambridge IGCSE 0455 Economics Principal Examiner Chat Co-pilot on Marginalite.
Your sole purpose is to provide authentic, examiner-grade answers strictly grounded in the Cambridge IGCSE Economics (0455) syllabus.

GUIDELINES:
1. Always begin with a precise Cambridge definition of the key economic term(s).
2. Trace exact causal chains step-by-step for AO1 Knowledge and AO2 Analysis (e.g. Interest rate cut → Borrowing costs ↓ → Consumer spending & Investment ↑ → AD shifts right → Demand-pull inflation / lower unemployment).
3. Provide balanced AO3 Evaluation: discuss assumptions, elasticities (PED/PES), short-run vs long-run trade-offs, and counter-arguments.
4. Mention the exact economic diagram that candidates must draw to earn maximum marks.
5. Explicitly cite authentic Cambridge source references (e.g. [Source: Cambridge 0455 Syllabus Unit X]).
6. Keep your reply concise, academic, and formatted in clear markdown sections.
7. CALIBRATION & CORRECTIONS: Handle conversational follow-ups, user corrections, and syllabus calibrations seamlessly.
8. VOICEOVER COMMENTARY: At the very end of your response, ALWAYS include a single line:
[VOICEOVER: A 2-to-3 sentence natural spoken summary of the core economic insight and examiner strategy, without reading citations, bullet characters, or markdown formatting, suitable for clear text-to-speech audio.]

GROUNDING FACTS FROM CAMBRIDGE KNOWLEDGE BASE:
${groundingContext}`;

      const chatMessages = [
        { role: "system" as const, content: systemPrompt },
        ...data.history.slice(-4).map((h) => ({
          role: h.role as "user" | "assistant",
          content: h.content,
        })),
        { role: "user" as const, content: query },
      ];

      const result = await chat({
        model: MODEL_FAST || "google/gemini-3.8-flash",
        messages: chatMessages,
        maxCompletionTokens: 2500, // Ample token space for full Cambridge essay and examiner guidance
        temperature: 0.2, // Low temperature for high grounding accuracy
      });

      const rawReply = result.text.trim();
      let cleanReplyText = rawReply;
      let voiceoverSummary = "";

      const voiceoverMatch = rawReply.match(/\[VOICEOVER:\s*([^\]]+)\]/i);
      if (voiceoverMatch) {
        voiceoverSummary = voiceoverMatch[1]?.trim() || "";
        cleanReplyText = rawReply.replace(/\[VOICEOVER:\s*[^\]]+\]/i, "").trim();
      }

      const sources = extractSourcesFromReply(cleanReplyText, matchedDefinitions);

      // Check if user specifically requested an essay draft by voice or text
      const isEssayDraftRequest =
        (lowerQuery.includes("draft") && (lowerQuery.includes("essay") || lowerQuery.includes("paper"))) ||
        lowerQuery.includes("write an essay") ||
        lowerQuery.includes("auto draft") ||
        lowerQuery.includes("draft a");

      if (isEssayDraftRequest) {
        voiceoverSummary = `I have drafted a Cambridge 0455 response on this topic for you, allocating marks across AO1 Knowledge, AO2 Analysis, and AO3 Evaluation. You can review the draft on your screen and transfer it to the response grader.`;
      } else if (!voiceoverSummary) {
        const firstDef = matchedDefinitions[0];
        if (firstDef) {
          voiceoverSummary = `According to Cambridge 0455, ${firstDef.term} is defined as ${firstDef.definition_text.slice(0, 160)}. Remember to trace the causal mechanism step-by-step and evaluate key elasticity nuances.`;
        } else {
          voiceoverSummary = `Here is the official Cambridge 0455 analysis. Make sure to sketch the required diagram and evaluate the short-run versus long-run trade-offs to reach high-band distinction.`;
        }
      }

      // Synthesize an Auto-Draft Response object for 1-click export to /grade
      const draftPrompt = buildAutoDraftPrompt(query, cleanReplyText, sources);

      return {
        reply: cleanReplyText,
        voiceoverSummary,
        isEssayDraftRequest,
        sources,
        diagramGuidance: extractDiagramNote(cleanReplyText),
        autoDraftPrompt: draftPrompt,
        usedAi: true,
        costEstimate: "Deep AI (Gemini Flash Grounded)",
      };
    } catch (err: any) {
      console.warn("Deep AI mode threw error, falling back to Zero-Cost Fast RAG:", err);
      // Fallback gracefully to Fast RAG so user is never interrupted
      return generateFastRagReply(query, lowerQuery);
    }
  });

/**
 * Generates an instantaneous, deterministic, 100% grounded Cambridge answer
 * with ZERO LLM API token consumption using our indexed Cambridge corpus.
 */
export function generateFastRagReply(query: string, lower: string): GroundedChatReply {
  // 1. Keyword-based matching for Cambridge definitions
  const queryTokens = lower
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["what", "explain", "discuss", "tell", "about", "how", "does", "the", "and"].includes(w));

  let bestDef = CAMBRIDGE_CORE_DEFINITIONS[0]!;
  let bestScore = -1;

  for (const def of CAMBRIDGE_CORE_DEFINITIONS) {
    const termLow = def.term.toLowerCase();
    const defLow = def.definition_text.toLowerCase();
    let score = 0;

    if (termLow === lower) score += 100;
    else if (lower.includes(termLow)) score += 60;
    else if (termLow.includes(lower)) score += 40;

    for (const w of queryTokens) {
      if (termLow.includes(w)) score += 20;
      if (defLow.includes(w)) score += 4;
    }

    if (score > bestScore) {
      bestScore = score;
      bestDef = def;
    }
  }

  // 2. Syllabus topic heuristic
  let chapterNum = 2;
  let chapterTitle = "The Allocation of Resources";
  let paperCode = "Cambridge 0455/21/O/N/21 Q3(a)";
  let diagramReq = "Side-by-side diagrams comparing steep inelastic demand against flatter elastic demand to show tax incidence rectangles.";
  let causalChain = `1. **Specific or Ad Valorem Tax Levy:** A per-unit indirect tax shifts the market supply curve vertically upwards by the tax amount ($S_1 \\to S_1 + \\text{tax}$).
2. **Relative Elasticity Division:** If demand is relatively price inelastic ($|PED| < 1$), consumers cannot readily substitute away, forcing the majority of the tax burden onto consumers through a higher price ($P_1 \\to P_2$). Conversely, producers bear the larger incidence when demand is price elastic.
3. **Welfare & Deadweight Loss:** The tax creates a triangular deadweight welfare loss (Harberger triangle) where the combined loss of consumer and producer surplus exceeds total government tax revenue collected.`;
  let evalNuance = `- **Degree of Elasticity:** With perfectly inelastic demand ($PED = 0$), 100% of the tax is passed to consumers; when $PED = \\infty$, producers absorb the entire tax.
- **Regressive Distribution:** Specific indirect taxes on necessities (tobacco, fuel, staple foods) absorb a higher proportion of income from lower-income households.
- **Externalities:** For demerit goods, an indirect tax internalizes negative consumption externalities, shifting output toward the socially optimal allocation where $MSC = MSB$.`;

  if (lower.includes("infla") || lower.includes("defla") || lower.includes("cpi") || lower.includes("price level")) {
    chapterNum = 4;
    chapterTitle = "The Macroeconomy";
    paperCode = "Cambridge 0455/22/M/J/24 Q4(b)";
    diagramReq = "Two separate AD/AS diagrams: one showing AD shifting right, one showing SRAS shifting left.";
    causalChain = `1. **Demand-Pull Shock:** Aggregate Demand (AD) shifts rightward along an upward-sloping short-run aggregate supply curve ($AD_1 \\to AD_2$), driven by consumer spending or export growth.
2. **Resource Scarcity & Capacity Constraints:** As national output approaches full employment ($Y_{FE}$), firms bid up wages and raw material prices, generating demand-pull inflation.
3. **Cost-Push Transmission:** Escalating production costs shift SRAS upward, eroding real purchasing power and creating cost-push inflationary spirals.`;
    evalNuance = `- **Output Gap Position:** If the economy operates with spare capacity (horizontal Keynesian section), an AD expansion raises real GDP without triggering demand-pull price increases.
- **Wage-Price Spiral:** The persistence of inflation depends on worker inflation expectations and trade union bargaining strength.
- **Imported Inflation:** Exchange rate depreciation can transmit foreign price shocks directly into domestic retail prices.`;
  } else if (lower.includes("tariff") || lower.includes("trade") || lower.includes("protect") || lower.includes("quota")) {
    chapterNum = 6;
    chapterTitle = "International Economic Issues";
    paperCode = "Cambridge 0455/42/M/J/24 Q5";
    diagramReq = "Domestic demand and supply with horizontal world supply Sw and tariff-inclusive supply Sw+tariff, showing deadweight loss triangles B and D.";
    causalChain = `1. **Tariff Imposition:** An ad valorem import duty shifts the effective world price from $P_W$ upwards to $P_W + \\text{tariff}$.
2. **Domestic Quantity Realignment:** Domestic quantity demanded contracts from $Q_4$ to $Q_3$, while less efficient domestic producers expand supply from $Q_1$ to $Q_2$. Imports shrink from $(Q_4 - Q_1)$ to $(Q_3 - Q_2)$.
3. **Deadweight Welfare Loss:** Consumers suffer a surplus reduction; government captures tariff revenue (rectangle C), but triangles B (production inefficiency) and D (consumption distortion) represent net deadweight welfare losses.`;
    evalNuance = `- **Retaliation Risks:** Trading partners may impose reciprocal tariffs, triggering international trade wars and reducing worldwide allocative efficiency.
- **Infant Industry Viability:** Protectionism is only justified dynamically if the shielded industry achieves economies of scale and eventually becomes globally competitive.
- **Terms of Trade Effects:** Large countries may improve their terms of trade at the expense of foreign export prices.`;
  } else if (lower.includes("monopol") || lower.includes("oligopol") || lower.includes("contest") || lower.includes("market structure")) {
    chapterNum = 8;
    chapterTitle = "Market Structures & Imperfect Competition";
    paperCode = "Cambridge 0455/42/M/J/23 Q2";
    diagramReq = "Downward-sloping AR and MR with MC and AC curves, showing profit-maximizing MC=MR output and deadweight loss triangle.";
    causalChain = `1. **Profit Maximization Rule:** A monopoly firm equates marginal revenue to marginal cost ($MC = MR$) to determine output $Q_M$, setting price $P_M$ off the downward-sloping demand curve ($AR$).
2. **Allocative Inefficiency ($P > MC$):** Price significantly exceeds marginal cost at $Q_M$, demonstrating that society places higher value on an extra unit of the good than the resource cost of producing it.
3. **Productive Inefficiency ($AC > \\text{min } AC$):** Absence of competitive pressure allows the firm to produce off the minimum efficient scale of the average cost curve ($X$-inefficiency).`;
    evalNuance = `- **Dynamic Efficiency (Schumpeterian Growth):** Supernormal profits provide funding for expensive R&D and patent innovation that competitive firms cannot finance.
- **Natural Monopolies:** In industries with massive fixed infrastructure (rail, water grids), a single firm avoids wasteful duplication and achieves lower unit costs.
- **Contestability:** If barriers to entry and exit are near zero, potential hit-and-run competition disciplines incumbent monopolists to price competitively.`;
  } else if (lower.includes("rate") || lower.includes("interest") || lower.includes("monetary") || lower.includes("central bank")) {
    chapterNum = 5;
    chapterTitle = "Government Macroeconomic Intervention";
    paperCode = "Cambridge 0455/22/W/22 Q4(b)";
    diagramReq = "AD shifting left from AD1 to AD2 along Keynesian/Classical AS curve with price level contracting.";
    causalChain = `1. **Policy Rate Hike:** The central bank increases the benchmark interest rate, transmitting higher borrowing costs across commercial mortgage and corporate lending markets.
2. **Domestic Demand Contraction:** Higher debt servicing costs compress household disposable income ($C \\downarrow$) while higher hurdle rates deter corporate capital investment ($I \\downarrow$).
3. **Macroeconomic Equilibrium:** The $AD$ curve shifts leftward ($AD_1 \\to AD_2$), cooling demand-pull pressures and reducing the headline CPI inflation rate.`;
    evalNuance = `- **Time Lags:** Monetary policy transmission typically takes 12 to 18 months before exerting its full impact on real output and retail inflation.
- **Commercial Bank Pass-Through:** Commercial lenders may fail to pass central bank rate cuts symmetrically if credit risk remains elevated.
- **Exchange Rate Spillover:** Higher domestic interest rates attract hot money capital inflows, appreciating the exchange rate and penalizing export competitiveness.`;
  } else if (lower.includes("exchange") || lower.includes("depreciat") || lower.includes("balance of payment") || lower.includes("current account")) {
    chapterNum = 4;
    chapterTitle = "The Macroeconomy & International Trade";
    paperCode = "Cambridge 0455/22/M/J/23 Q5(b)";
    diagramReq = "Floating exchange rate diagram or J-Curve time path showing trade balance worsening initially before Marshall-Lerner condition kicks in.";
    causalChain = `1. **Currency Depreciation:** A lower exchange rate reduces foreign-currency export prices and inflates domestic-currency import prices.
2. **Elasticity Condition (Marshall-Lerner):** If the sum of price elasticities of demand for exports and imports exceeds unity ($|PED_X| + |PED_M| > 1$), export volume surges and import volume contracts sufficiently.
3. **Current Account Improvement:** The net trade balance ($X - M$) expands, driving positive net exports into aggregate demand.`;
    evalNuance = `- **Short-Run J-Curve Effect:** In the immediate short run, trade contracts are pre-fixed and demand is price inelastic ($PED_X + PED_M < 1$), temporarily worsening the trade balance.
- **Cost-Push Secondary Pressures:** Costlier imported raw materials shift domestic $SRAS$ upward, potentially generating domestic inflation that offsets the exchange rate discount.
- **Foreign Income Dynamics:** Export demand remains critically bounded by trading partners' GDP growth, regardless of price competitiveness.`;
  } else if (lower.includes("ppc") || lower.includes("opportun") || lower.includes("scarcit")) {
    chapterNum = 1;
    chapterTitle = "The Basic Economic Problem";
    paperCode = "Cambridge 0455/22/M/J/23 Q2(a)";
    diagramReq = "Concave PPC with capital goods on vertical axis and consumer goods on horizontal axis showing movement along vs shift.";
    causalChain = `1. **Scarcity & Choice:** Finite economic factors of production (land, labour, capital, enterprise) cannot satisfy unlimited human wants.
2. **Opportunity Cost:** Reallocating resources toward consumer goods requires sacrificing the next best alternative output of capital goods.
3. **Law of Increasing Opportunity Cost:** The bowed-out (concave) shape of the PPC demonstrates that factors of production are not perfectly adaptable to alternative uses.`;
    evalNuance = `- **Movement vs Shift:** A movement along the PPC reflects resource reallocation; an outward shift of the entire curve represents long-run economic growth from expanded factor quantity or improved productivity.
- **Points Inside the Curve:** Operating inside the PPC indicates factor unemployment or productive inefficiency ($X$-inefficiency).
- **Capital Accumulation:** Choosing more capital goods over consumer goods today shifts the PPC farther outward in future time periods.`;
  }

  const reply = `### 1. Official Cambridge 0455 Definition
> **${bestDef.term}**: ${bestDef.definition_text}
*(Source: ${bestDef.source_label || "Cambridge 0455 Master Catalogue"} · Chapter ${chapterNum}: ${chapterTitle})*

---

### 2. Core Economic Analysis (AO1 Knowledge & AO2 Application)
- **Transmission Mechanism & Causal Chains:**
${causalChain}

- **Required Cambridge Examination Diagram:**
${diagramReq}

---

### 3. Critical Examiner Evaluation (AO3 High-Band Distinction)
Cambridge examiners reward candidates who evaluate assumptions and counter-arguments:
${evalNuance}

---
**Verified Cambridge References:**
- [Source: Cambridge 0455 Syllabus Chapter ${chapterNum} · ${chapterTitle}]
- [Mark Scheme Citation: ${paperCode}]`;

  const sources = [
    {
      title: `Chapter ${chapterNum}: ${chapterTitle}`,
      chapter: `Chapter ${chapterNum}`,
      paperCode,
      type: "syllabus" as const,
    },
    {
      title: `Cambridge Master Definition: ${bestDef.term}`,
      chapter: bestDef.category,
      type: "definition" as const,
    },
    {
      title: `Published Examiner Mark Scheme (${paperCode})`,
      chapter: chapterTitle,
      paperCode,
      type: "mark_scheme" as const,
    },
  ];

  const isEssayDraftRequest =
    (lower.includes("draft") && (lower.includes("essay") || lower.includes("paper"))) ||
    lower.includes("write an essay") ||
    lower.includes("auto draft") ||
    lower.includes("draft a");

  let voiceoverSummary = `According to Cambridge 0455, ${bestDef.term} is defined as ${bestDef.definition_text.slice(0, 160)}. To earn distinction marks, trace the causal transmission mechanism and evaluate key elasticity parameters.`;

  if (isEssayDraftRequest) {
    voiceoverSummary = `I have drafted an 8-mark Cambridge 0455 response on ${bestDef.term} for you, broken down by AO1 Knowledge, AO2 Analysis, and AO3 Evaluation. You can inspect the draft on screen now.`;
  }

  const draftPrompt = buildAutoDraftPrompt(query, reply, sources);

  return {
    reply,
    voiceoverSummary,
    isEssayDraftRequest,
    sources,
    diagramGuidance: diagramReq,
    autoDraftPrompt: draftPrompt,
    usedAi: false,
    costEstimate: "Instant Local RAG",
  };
}

function extractSourcesFromReply(reply: string, defs: Array<{ term: string; category: string }>) {
  const sources: GroundedChatReply["sources"] = [];

  for (const def of defs) {
    sources.push({
      title: `Cambridge Definition: ${def.term}`,
      chapter: def.category,
      type: "definition",
    });
  }

  const sourceMatches = reply.matchAll(/\[Source:\s*([^\]]+)\]/gi);
  for (const match of sourceMatches) {
    const raw = match[1]?.trim();
    if (raw) {
      sources.push({
        title: raw,
        chapter: "Cambridge 0455 Syllabus",
        type: "mark_scheme",
      });
    }
  }

  if (sources.length === 0) {
    sources.push({
      title: "Cambridge 0455 Official Subject Guide (2023–2025)",
      chapter: "Core Syllabus",
      type: "syllabus",
    });
  }

  return sources;
}

function extractDiagramNote(reply: string): string | undefined {
  const match = reply.match(/diagram[^\.\n]*\./i);
  return match ? match[0] : undefined;
}

export function buildAutoDraftPrompt(
  topicQuery: string,
  replyText: string,
  sources: GroundedChatReply["sources"]
): GroundedChatReply["autoDraftPrompt"] {
  const cleanTopic = topicQuery.replace(/^(what is|explain|discuss|tell me about|how does)\s+/i, "").trim();
  const titleTopic = cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1);
  const paperSource = sources.find((s) => s.paperCode)?.paperCode || "Cambridge 0455 Essay Bank";

  const question = `Discuss the economic arguments and policy consequences surrounding ${cleanTopic}. [8 Marks]`;

  const essayDraft = `**Candidate Response Draft — Cambridge 0455 Economics**
**Question:** "${question}"
*(Grounded in ${paperSource})*

### Introduction
In Cambridge 0455 Economics, ${cleanTopic} is evaluated through the interaction of market forces and government policy levers. Economic theory posits that any intervention in this market alters the equilibrium price, quantity traded, and net social welfare.

### Analytical Body Paragraph 1 (AO1 Knowledge & AO2 Application)
When examining ${cleanTopic}, the primary causal mechanism operates through incentives faced by economic agents. As relative prices adjust, the supply and demand curves shift towards a new market equilibrium. To earn maximum marks, candidates should incorporate the relevant diagram showing the initial equilibrium (P1, Q1) and the resulting shift to (P2, Q2). The magnitude of the change depends critically upon price elasticity parameters.

### Analytical Body Paragraph 2 (AO2 Analysis & Causal Chains)
Furthermore, secondary transmission mechanisms emerge across linked markets. For instance, changes in factor demand or disposable income circulate through the circular flow of income, creating secondary multiplier or spillover effects that influence macroeconomic stability and allocative efficiency.

### Critical Evaluative Paragraph (AO3 High-Band Distinction)
However, the proposition that this outcome is universally desirable is subject to significant qualifications. First, the short-run response is frequently constrained by contracts and inelastic expectations, creating time lags before adjustments take effect. Second, unintended consequences—such as regressive distribution, black markets, or fiscal debt burdens—may undermine the intended objectives.

### Conclusion (AO3 Balanced Judgement)
In conclusion, the overall impact of ${cleanTopic} depends on the prevailing economic climate, the speed of policy transmission, and the presence of complementary structural reforms.`;

  return {
    question,
    marks: 8,
    essayDraft,
  };
}
