/**
 * Next-Generation Deterministic Grammar, Clarity & Academic Writing Engine.
 *
 * Provides Grammarly-level multi-layer writing diagnostics for Cambridge Economics:
 * - Layer 1: Mechanics & Grammar (subject-verb agreement, modal verbs, repeated words, articles)
 * - Layer 2: Sentence Construction & Clarity (redundancy, wordiness, convoluted expressions)
 * - Layer 3: Academic Writing Tone (informal idioms, colloquial phrasing, precision)
 * - Layer 4: Subject-Specific Economic Misconceptions (shift vs movement, fiscal vs monetary, public vs merit)
 *
 * Runs in 0ms without consuming AI tokens or API credits.
 * Includes a strict Cambridge whitelist to eliminate false positives on technical economics terms.
 */

import type { IssueCategory, IssueSeverity } from "@/hooks/use-live-examiner-check";

export type GrammarRuleIssue = {
  original: string;
  suggestion: string;
  category: IssueCategory;
  severity: IssueSeverity;
  explanation: string;
  context: string;
  evidence?: string;
  ruleId: string;
  startOffset: number;
  endOffset: number;
};

type RuleDefinition = {
  id: string;
  category: IssueCategory;
  severity: IssueSeverity;
  pattern: RegExp;
  getSuggestion: (match: RegExpExecArray) => string;
  explanation: string;
  evidence?: string;
};

// ---------------------------------------------------------------------------
// 1. Cambridge Economics Whitelist — terms that must NEVER be flagged as errors
// ---------------------------------------------------------------------------
export const CAMBRIDGE_ECONOMICS_WHITELIST: ReadonlySet<string> = new Set([
  // Latin economic terms
  "ceteris paribus",
  "ex ante",
  "ex post",
  "per capita",
  "de facto",
  "ad valorem",
  "quid pro quo",

  // Core technical concepts
  "diseconomies",
  "diseconomies of scale",
  "economies of scale",
  "monopsony",
  "monopolistic competition",
  "oligopoly",
  "externalities",
  "negative externality",
  "positive externality",
  "merit good",
  "merit goods",
  "demerit good",
  "demerit goods",
  "public good",
  "public goods",
  "non-rival",
  "non-rivalrous",
  "non-excludable",
  "deadweight loss",
  "allocative efficiency",
  "productive efficiency",
  "dynamic efficiency",
  "x-inefficiency",
  "asymmetric information",
  "moral hazard",
  "adverse selection",
  "hyperinflation",
  "stagflation",
  "deflationary",
  "inflationary",
  "disinflation",
  "crowding out",
  "crowding-out",
  "seigniorage",
  "liquidity trap",
  "multiplier",
  "accelerator",
  "marginal propensity",
  "supply-side",
  "demand-side",
  "balance of payments",
  "current account",
  "capital account",
  "financial account",
  "terms of trade",
  "purchasing power parity",
  "comparative advantage",
  "absolute advantage",
  "opportunity cost",
  "production possibility frontier",
  "production possibility curve",
  "regressive tax",
  "progressive tax",
  "proportional tax",
  "marshall-lerner",
  "j-curve",
  "kuznets curve",
  "lorenz curve",
  "gini coefficient",
  "phillips curve",
  "harrod-domar",
  "keynesian",
  "monetarist",
  "pigouvian",
  "pareto optimal",
  "pareto efficiency",
  "tradable permits",
  "cap and trade",
]);

// ---------------------------------------------------------------------------
// 2. Multi-Layer Rules
// ---------------------------------------------------------------------------

const RULES: RuleDefinition[] = [
  // --- LAYER 1: Mechanics & Grammar ---
  {
    id: "repeated_words",
    category: "grammar",
    severity: "medium",
    pattern: /\b(the|in|of|to|is|and|that|for|with|as|at|on)\s+\1\b/i,
    getSuggestion: (m) => m[1],
    explanation: "Accidental repeated word.",
  },
  {
    id: "sv_government_plural",
    category: "grammar",
    severity: "low",
    pattern: /\bthe\s+government\s+(are|were|have)\b/i,
    getSuggestion: (m) => {
      const v = m[1].toLowerCase();
      const repl = v === "are" ? "is" : v === "were" ? "was" : "has";
      return `the government ${repl}`;
    },
    explanation:
      "In academic English, 'government' functions as a singular collective entity ('the government is/has').",
  },
  {
    id: "sv_central_bank",
    category: "grammar",
    severity: "low",
    pattern: /\bthe\s+central\s+bank\s+(are|have)\b/i,
    getSuggestion: (m) => {
      const v = m[1].toLowerCase();
      return `the central bank ${v === "are" ? "is" : "has"}`;
    },
    explanation: "'The central bank' is singular; use 'is' or 'has'.",
  },
  {
    id: "sv_consumers_has",
    category: "grammar",
    severity: "medium",
    pattern: /\bconsumers\s+has\b/i,
    getSuggestion: () => "consumers have",
    explanation: "Plural subject 'consumers' requires plural verb 'have'.",
  },
  {
    id: "sv_firms_aims",
    category: "grammar",
    severity: "medium",
    pattern: /\bfirms\s+(aims|seeks|wants|produces)\b/i,
    getSuggestion: (m) => `firms ${m[1].slice(0, -1)}`,
    explanation: "Plural subject 'firms' requires plural verb form.",
  },
  {
    id: "modal_verb_inflection",
    category: "grammar",
    severity: "high",
    pattern:
      /\b(will|can|could|would|should|may|might|must)\s+(causes|leads|increases|decreases|results|creates|shifts)\b/i,
    getSuggestion: (m) => `${m[1]} ${m[2].slice(0, -1)}`,
    explanation: "Modal auxiliary verbs must be followed by base form of the verb without '-s'.",
  },
  {
    id: "modal_leads_to",
    category: "grammar",
    severity: "high",
    pattern: /\b(can|could|will|would|might|should)\s+leads\s+to\b/i,
    getSuggestion: (m) => `${m[1]} lead to`,
    explanation: "Modal verbs require base verb: use 'lead to' instead of 'leads to'.",
  },
  {
    id: "article_vowel_sound",
    category: "grammar",
    severity: "medium",
    pattern:
      /\ba\s+(economy|economic|equilibrium|increase|decrease|externality|elasticity|oligopoly|opportunity|interest|inflationary)\b/i,
    getSuggestion: (m) => `an ${m[1]}`,
    explanation: "Use indefinite article 'an' before words beginning with vowel sounds.",
  },
  {
    id: "article_consonant_sound",
    category: "grammar",
    severity: "medium",
    pattern: /\ban\s+(market|price|subsidy|tariff|government|tax|firm|monopoly|surplus|deficit)\b/i,
    getSuggestion: (m) => `a ${m[1]}`,
    explanation: "Use indefinite article 'a' before consonant sounds.",
  },
  {
    id: "affect_vs_effect",
    category: "grammar",
    severity: "high",
    pattern: /\b(?:will|can|could|would|should|may|might|to)\s+effect\s+(?:demand|supply|consumption|investment|growth|output|prices?|inflation|trade)\b/i,
    getSuggestion: (m) => m[0].replace(/\beffect\b/i, "affect"),
    explanation: "'Affect' is the verb meaning to influence; 'effect' is the noun meaning the result or outcome.",
  },
  {
    id: "loose_vs_lose",
    category: "grammar",
    severity: "medium",
    pattern: /\b(?:will|can|may|might|could|to)\s+loose\s+(?:money|profit|revenue|welfare|efficiency|market\s+share)\b/i,
    getSuggestion: (m) => m[0].replace(/\bloose\b/i, "lose"),
    explanation: "'Lose' means to suffer a loss of profit or revenue; 'loose' means not tight or unbound.",
  },
  {
    id: "there_vs_their",
    category: "grammar",
    severity: "medium",
    pattern: /\btheir\s+(?:is|are|was|were)\s+an?\b/i,
    getSuggestion: (m) => m[0].replace(/\btheir\b/i, "there"),
    explanation: "Use existential 'there' ('there is/are') rather than the possessive pronoun 'their'.",
  },
  {
    id: "its_vs_its_contraction",
    category: "grammar",
    severity: "medium",
    pattern:
      /\bit's\s+(?:(?:negative|positive|external|social|private|adverse|long-run|short-run|own|actual)\s+)?(?:price|prices|cost|costs|output|curve|curves|impact|impacts|effect|effects|equilibrium|supply|demand|elasticity|revenue|externailties|externalities|benefit|benefits|consequence|consequences|failure|failures|faliure)\b/i,
    getSuggestion: (m) => m[0].replace(/\bit's\b/i, "its"),
    explanation: "Use possessive 'its' without an apostrophe; 'it's' is a contraction of 'it is'.",
  },
  {
    id: "past_tense_led",
    category: "grammar",
    severity: "low",
    pattern: /\bwhich\s+lead\s+to\s+(?:an?\s+increase|a\s+decrease|higher|lower|inflation|growth|unemployment)\b/i,
    getSuggestion: (m) => m[0].replace(/\blead\b/i, "led"),
    explanation: "The past tense of the verb 'lead' is 'led' ('which led to...').",
  },

  // --- LAYER 2: Sentence Construction, Redundancy & Clarity ---
  {
    id: "redundancy_due_to_the_fact",
    category: "clarity",
    severity: "low",
    pattern: /\bdue\s+to\s+the\s+fact\s+that\b/i,
    getSuggestion: () => "because",
    explanation: "Concise academic phrasing: 'because' is more direct than 'due to the fact that'.",
  },
  {
    id: "redundancy_at_this_moment",
    category: "clarity",
    severity: "low",
    pattern: /\bat\s+(?:this\s+moment\s+in\s+time|the\s+present\s+moment\s+in\s+time)\b/i,
    getSuggestion: () => "currently",
    explanation: "'Currently' or 'at present' expresses this with greater conciseness.",
  },
  {
    id: "redundancy_in_order_to",
    category: "clarity",
    severity: "low",
    pattern: /\bin\s+order\s+to\b/i,
    getSuggestion: () => "to",
    explanation: "'To' carries identical analytical meaning without unnecessary wordiness.",
  },
  {
    id: "redundancy_has_the_ability",
    category: "clarity",
    severity: "low",
    pattern: /\bhas\s+the\s+(?:ability|capability)\s+to\b/i,
    getSuggestion: () => "can",
    explanation: "Use direct modal verb 'can' for active, concise economic analysis.",
  },
  {
    id: "redundancy_take_into_consideration",
    category: "clarity",
    severity: "low",
    pattern: /\btake\s+into\s+consideration\b/i,
    getSuggestion: () => "consider",
    explanation: "'Consider' conveys the same meaning more concisely.",
  },
  {
    id: "redundancy_bring_about",
    category: "clarity",
    severity: "low",
    pattern: /\bbring\s+about\s+an?\s+(increase|decrease|reduction|expansion)\s+in\b/i,
    getSuggestion: (m) => {
      const noun = m[1].toLowerCase();
      if (noun === "increase" || noun === "expansion") return "increase";
      return "reduce";
    },
    explanation:
      "Use active verbs (e.g. 'increase' or 'reduce') rather than nominalised phrases like 'bring about an increase'.",
  },

  // --- LAYER 3: Academic Writing Tone & Precision ---
  {
    id: "academic_tone_a_lot_of",
    category: "clarity",
    severity: "low",
    pattern: /\b(?:a\s+lot\s+of|lots\s+of)\b/i,
    getSuggestion: () => "a substantial volume of",
    explanation:
      "'A lot of' is informal in Cambridge essays; prefer 'a substantial quantity of', 'significant', or 'widespread'.",
  },
  {
    id: "academic_tone_huge",
    category: "clarity",
    severity: "low",
    pattern: /\b(?:huge|massive)\s+(amount|quantity|impact|effect)\b/i,
    getSuggestion: (m) => `substantial ${m[1]}`,
    explanation: "'Substantial' or 'significant' is standard academic tone for 0455 essays.",
  },
  {
    id: "academic_tone_things",
    category: "clarity",
    severity: "medium",
    pattern: /\b(?:good|bad)\s+(?:things|stuff)\b/i,
    getSuggestion: (m) =>
      m[0].toLowerCase().includes("good")
        ? "positive economic outcomes"
        : "adverse economic effects",
    explanation: "Vague colloquial phrasing. Specify precise economic outcomes or welfare impacts.",
  },
  {
    id: "academic_tone_money_printing",
    category: "terminology",
    severity: "medium",
    pattern: /\bmoney\s+printing\b/i,
    getSuggestion: () => "quantitative easing",
    explanation:
      "Cambridge standard terminology is 'quantitative easing' (asset purchases) or 'expansionary monetary policy'.",
  },
  {
    id: "economic_vs_economical",
    category: "terminology",
    severity: "medium",
    pattern: /\ban?\s+economical\s+(?:growth|development|policy|recession|crisis|system|equilibrium|model|analysis)\b/i,
    getSuggestion: (m) => m[0].replace(/\beconomical\b/i, "economic"),
    explanation: "Use 'economic' when relating to the economy or theory; 'economical' means thrifty, inexpensive, or saving money.",
  },
  {
    id: "compliment_vs_complement",
    category: "terminology",
    severity: "high",
    pattern: /\bcomplimentary\s+goods?\b/i,
    getSuggestion: (m) => m[0].replace(/\bcomplimentary\b/i, "complementary"),
    explanation: "Goods in joint demand are 'complementary goods' (spelled with an 'e'), distinct from 'complimentary' (praising or free of charge).",
  },

  // --- LAYER 4: Subject-Specific Economic Misconceptions ---
  {
    id: "misconception_shift_vs_movement_demand",
    category: "misconception",
    severity: "high",
    pattern:
      /\bdemand\s+(?:increased|increased|decreased|fell)\s+because\s+the\s+price\s+(?:fell|dropped|decreased|rose|increased)\b/i,
    getSuggestion: (m) => {
      const isRise = /fell|dropped|decreased/i.test(m[0]);
      return isRise
        ? "quantity demanded increased (movement along demand curve)"
        : "quantity demanded fell (movement along demand curve)";
    },
    explanation:
      "Fundamental misconception: a change in price causes a movement along the demand curve ('change in quantity demanded'), NOT a shift in demand.",
    evidence:
      "A change in the price of the good itself causes a movement along the demand curve, whereas a change in non-price determinants shifts the curve.",
  },
  {
    id: "misconception_shift_vs_movement_supply",
    category: "misconception",
    severity: "high",
    pattern:
      /\bsupply\s+(?:increased|increased|decreased|fell)\s+because\s+the\s+price\s+(?:fell|dropped|decreased|rose|increased)\b/i,
    getSuggestion: (m) => {
      const isRise = /rose|increased/i.test(m[0]);
      return isRise
        ? "quantity supplied increased (movement along supply curve)"
        : "quantity supplied decreased (movement along supply curve)";
    },
    explanation:
      "Fundamental misconception: price changes cause a movement along the supply curve ('quantity supplied'), not a shift of the supply curve.",
    evidence:
      "A change in the price of the good leads to a movement along the supply curve, distinct from shifts caused by changes in costs of production.",
  },
  {
    id: "misconception_fiscal_interest_rates",
    category: "misconception",
    severity: "high",
    pattern: /\bfiscal\s+policy\s+(?:lowered|cut|reduced|raised|increased)\s+interest\s+rates\b/i,
    getSuggestion: () => "monetary policy adjusted interest rates",
    explanation:
      "Instrument confusion: interest rates are determined by monetary policy (central banks), while fiscal policy controls taxation and government expenditure.",
    evidence:
      "Monetary policy involves changes in interest rates and money supply; fiscal policy involves government spending and taxation.",
  },
  {
    id: "misconception_monetary_taxation",
    category: "misconception",
    severity: "high",
    pattern:
      /\bmonetary\s+policy\s+(?:increased|cut|raised|reduced)\s+(?:taxes|taxation|government\s+spending)\b/i,
    getSuggestion: () => "fiscal policy adjusted taxes",
    explanation:
      "Instrument confusion: taxes and government spending are instruments of fiscal policy, not monetary policy.",
    evidence:
      "Fiscal policy is the manipulation of government spending and taxation to influence aggregate demand.",
  },
  {
    id: "misconception_public_vs_merit_health",
    category: "misconception",
    severity: "high",
    pattern:
      /\bpublic\s+goods\s+such\s+as\s+(?:healthcare|health\s+care|education|schools|hospitals)\b/i,
    getSuggestion: () => "merit goods such as healthcare and education",
    explanation:
      "Healthcare and education are merit goods (excludable and rival in consumption, with positive externalities), NOT public goods (which must be non-excludable and non-rival).",
    evidence:
      "Merit goods are rival and excludable goods that are under-consumed in a free market due to information failure and positive externalities, unlike pure public goods.",
  },
  {
    id: "misconception_deflation_vs_disinflation",
    category: "misconception",
    severity: "high",
    pattern:
      /\bdeflation\s+means\s+(?:prices\s+are\s+rising\s+slower|inflation\s+is\s+slowing|the\s+rate\s+of\s+inflation\s+is\s+falling)\b/i,
    getSuggestion: () =>
      "disinflation means a falling inflation rate, whereas deflation is a negative inflation rate (falling price level)",
    explanation:
      "A falling rate of positive inflation is 'disinflation'. 'Deflation' specifically denotes a sustained fall in the general price level (negative inflation rate).",
    evidence:
      "Deflation is a persistent decrease in the general price level, whereas disinflation refers to a decrease in the rate of inflation while it remains positive.",
  },
  {
    id: "misconception_current_account_vs_budget",
    category: "misconception",
    severity: "high",
    pattern:
      /\ba\s+current\s+account\s+deficit\s+means\s+the\s+government\s+(?:spends\s+more\s+than\s+it\s+taxes|is\s+in\s+debt)\b/i,
    getSuggestion: () =>
      "a budget (fiscal) deficit occurs when government spending exceeds tax revenue",
    explanation:
      "Confusing international trade with government accounts: a current account deficit is net trade & income outflows; a budget deficit is government spending exceeding tax revenue.",
    evidence:
      "The current account records trade in goods, services, primary income and secondary income. A budget deficit occurs when government expenditure exceeds tax revenue.",
  },
  {
    id: "misconception_monopoly_vs_monopsony",
    category: "misconception",
    severity: "high",
    pattern: /\bmonopoly\s+(?:buyer|purchaser|employer)\b/i,
    getSuggestion: (m) => m[0].replace(/\bmonopoly\b/i, "monopsony"),
    explanation:
      "A sole dominant buyer or employer is a 'monopsony', whereas a 'monopoly' is a sole seller.",
    evidence:
      "Monopsony is market power exerted by a single or dominant buyer, whereas monopoly refers to a single seller.",
  },
  {
    id: "misconception_fixed_costs_long_run",
    category: "misconception",
    severity: "high",
    pattern: /\bin\s+the\s+long\s+run,?\s+(?:firms\s+have\s+fixed\s+costs|fixed\s+costs\s+(?:cannot|can't)\s+be\s+changed)\b/i,
    getSuggestion: () => "in the long run all factors of production and costs are variable",
    explanation:
      "In economic theory, the long run is defined as the time period over which all factors of production and costs are variable.",
    evidence:
      "The long run is a period of time in which all factors of production and costs can be varied.",
  },
  {
    id: "sv_consumer_are",
    category: "grammar",
    severity: "high",
    pattern: /\bconsumer\s+are\b/i,
    getSuggestion: () => "consumers are",
    explanation: "Subject-verb agreement: use plural 'consumers are' or 'the consumer is'.",
  },
  {
    id: "modal_of_instead_of_have",
    category: "grammar",
    severity: "high",
    pattern: /\b(should|could|would|might|must)\s+of\b/gi,
    getSuggestion: (m) => preserveCase(m[0], `${m[1].toLowerCase()} have`),
    explanation: "Use 'have' after a modal verb, not 'of'.",
  },
  {
    id: "alot_one_word",
    category: "grammar",
    severity: "medium",
    pattern: /\balot\b/gi,
    getSuggestion: (m) => preserveCase(m[0], "a lot"),
    explanation: "'A lot' is two words.",
  },
  {
    id: "a_before_vowel_econ",
    category: "grammar",
    severity: "medium",
    pattern: /\ba\s+(increase|economy|economic|externality|inflation|effect|elasticity|equilibrium|unemployment|appreciation|opportunity|income|industry|incentive|inelastic|elastic|expansion|upward|average|important|individual|evaluation|analysis|example|assumption|imbalance|improvement)\b/gi,
    getSuggestion: (m) => preserveCase(m[0], `an ${m[1].toLowerCase()}`),
    explanation: "Use 'an' before a word that starts with a vowel sound.",
  },
  {
    id: "less_vs_fewer",
    category: "grammar",
    severity: "low",
    pattern: /\bless\s+(firms|consumers|people|workers|producers|goods|jobs|units|sales|products|households|countries|businesses|customers|suppliers)\b/gi,
    getSuggestion: (m) => preserveCase(m[0], `fewer ${m[1].toLowerCase()}`),
    explanation: "Use 'fewer' with countable plural nouns.",
  },
  {
    id: "amount_vs_number",
    category: "grammar",
    severity: "low",
    pattern: /\bamount\s+of\s+(firms|consumers|people|workers|producers|goods|jobs|units|products|households|countries|businesses|customers|suppliers)\b/gi,
    getSuggestion: (m) => preserveCase(m[0], `number of ${m[1].toLowerCase()}`),
    explanation: "Use 'number of' with countable plural nouns.",
  },
  {
    id: "then_vs_than",
    category: "grammar",
    severity: "high",
    pattern: /\b(more|less|higher|lower|greater|larger|smaller|better|worse|bigger|rather|other|elastic|inelastic|responsive|efficient|effective)\s+then\b/gi,
    getSuggestion: (m) => preserveCase(m[0], `${m[1].toLowerCase()} than`),
    explanation: "Use 'than' for comparisons; 'then' refers to time or sequence.",
  },
  {
    id: "missing_apostrophe_contraction",
    category: "grammar",
    severity: "medium",
    pattern: /\b(dont|doesnt|isnt|arent|wasnt|werent|cant|didnt|couldnt|wouldnt|shouldnt|hasnt|havent)\b/gi,
    getSuggestion: (m) => {
      const map: Record<string, string> = {
        dont: "do not", doesnt: "does not", isnt: "is not", arent: "are not", wasnt: "was not",
        werent: "were not", cant: "cannot", didnt: "did not", couldnt: "could not",
        wouldnt: "would not", shouldnt: "should not", hasnt: "has not", havent: "have not",
      };
      return preserveCase(m[0], map[m[1].toLowerCase()]);
    },
    explanation: "Missing apostrophe — and academic writing avoids contractions, so write it in full.",
  },
  {
    id: "contraction_academic_tone",
    category: "clarity",
    severity: "low",
    pattern: /\b(don't|doesn't|isn't|aren't|wasn't|weren't|can't|won't|didn't|couldn't|wouldn't|shouldn't|hasn't|haven't)\b/gi,
    getSuggestion: (m) => {
      const map: Record<string, string> = {
        "don't": "do not", "doesn't": "does not", "isn't": "is not", "aren't": "are not",
        "wasn't": "was not", "weren't": "were not", "can't": "cannot", "won't": "will not",
        "didn't": "did not", "couldn't": "could not", "wouldn't": "would not",
        "shouldn't": "should not", "hasn't": "has not", "haven't": "have not",
      };
      return preserveCase(m[0], map[m[1].toLowerCase()]);
    },
    explanation: "Academic tone: write contractions in full.",
  },
  {
    id: "sv_the_plural_is",
    category: "grammar",
    severity: "high",
    pattern: /\b(the|these|those|many|most|some|all)\s+(prices|firms|policies|costs|taxes|subsidies|externalities|consumers|workers|producers|markets|exports|imports|profits|incomes)\s+is\b/gi,
    getSuggestion: (m) => `${m[1]} ${m[2]} are`,
    explanation: "Subject-verb agreement: a plural subject takes 'are'.",
  },
  {
    id: "sv_the_singular_are",
    category: "grammar",
    severity: "high",
    pattern: /\b(the|this|that)\s+(demand|supply|inflation|unemployment|elasticity|firm|market|price|policy|tax|subsidy|economy|monopoly)\s+are\b/gi,
    getSuggestion: (m) => `${m[1]} ${m[2]} is`,
    explanation: "Subject-verb agreement: a singular subject takes 'is'.",
  },
  {
    id: "sv_this_lead_to",
    category: "grammar",
    severity: "high",
    pattern: /\b(this|it)\s+(lead to|result in)\b/gi,
    getSuggestion: (m) => `${m[1]} ${m[2] === "lead to" || m[2].toLowerCase() === "lead to" ? "leads to" : "results in"}`,
    explanation: "Subject-verb agreement: use 'leads to' / 'results in' with a singular subject.",
  },
  {
    id: "principle_vs_principal",
    category: "grammar",
    severity: "medium",
    pattern: /\bprincipal\s+of\s+(diminishing|comparative|opportunity|equi-marginal)\b/gi,
    getSuggestion: (m) => `principle of ${m[1]}`,
    explanation: "'Principle' means a rule or law; 'principal' means main.",
  },
  {
    id: "on_the_other_hand_fix",
    category: "clarity",
    severity: "medium",
    pattern: /\bin the other hand\b/gi,
    getSuggestion: (m) => preserveCase(m[0], "on the other hand"),
    explanation: "The fixed phrase is 'on the other hand'.",
  },
  {
    id: "as_a_conclusion_fix",
    category: "clarity",
    severity: "low",
    pattern: /\bas a conclusion\b/gi,
    getSuggestion: (m) => preserveCase(m[0], "in conclusion"),
    explanation: "Use 'in conclusion'.",
  },
  {
    id: "one_word_phrases",
    category: "grammar",
    severity: "medium",
    pattern: /\b(inspite of|infact|eventhough|atleast|incase of|aswell)\b/gi,
    getSuggestion: (m) => {
      const map: Record<string, string> = {
        "inspite of": "in spite of", infact: "in fact", eventhough: "even though",
        atleast: "at least", "incase of": "in case of", aswell: "as well",
      };
      return preserveCase(m[0], map[m[1].toLowerCase()]);
    },
    explanation: "Incorrectly joined or split phrase.",
  },
  {
    id: "double_comparative",
    category: "grammar",
    severity: "medium",
    pattern: /\b(more|most)\s+(cheaper|cheapest|higher|lower|bigger|larger|smaller|faster|better|worse|biggest|largest|smallest|highest|lowest)\b/gi,
    getSuggestion: (m) => preserveCase(m[0], m[2].toLowerCase()),
    explanation: "Double comparative: use either 'more' or the -er form, not both.",
  },
  {
    id: "very_unique",
    category: "clarity",
    severity: "low",
    pattern: /\b(very|more|most)\s+unique\b/gi,
    getSuggestion: (m) => preserveCase(m[0], "unique"),
    explanation: "'Unique' is absolute and cannot be graded.",
  },
  {
    id: "missing_space_after_comma",
    category: "grammar",
    severity: "low",
    pattern: /\b([A-Za-z]{2,}),([A-Za-z]{2,})\b/g,
    getSuggestion: (m) => `${m[1]}, ${m[2]}`,
    explanation: "Add a space after the comma.",
  },
  {
    id: "sentence_starts_lowercase",
    category: "grammar",
    severity: "low",
    pattern: /^(?!(?:i\.e|e\.g)\b)[a-z][a-z'-]*/,
    getSuggestion: (m) => m[0][0].toUpperCase() + m[0].slice(1),
    explanation: "Begin a sentence with a capital letter.",
  },
  {
    id: "double_punctuation_typo",
    category: "grammar",
    severity: "low",
    pattern: /\b(\w+)\s*\.,/i,
    getSuggestion: (m) => `${m[1]},`,
    explanation: "Accidental repeated punctuation (period followed by comma).",
  },
  {
    id: "could_of_would_of",
    category: "grammar",
    severity: "high",
    pattern: /\b(could|would|should|must|might)\s+of\b/gi,
    getSuggestion: (m) => `${m[1]} have`,
    explanation: "Write '${m[1]} have', not '${m[1]} of'.",
  },
  {
    id: "irregardless_standard",
    category: "grammar",
    severity: "medium",
    pattern: /\birregardless\b/gi,
    getSuggestion: (m) => preserveCase(m[0], "regardless"),
    explanation: "Use the standard academic form 'regardless'.",
  },
  {
    id: "in_regards_to",
    category: "clarity",
    severity: "low",
    pattern: /\bin\s+regards\s+to\b/gi,
    getSuggestion: (m) => preserveCase(m[0], "with regard to"),
    explanation: "Write 'with regard to' or 'regarding' in formal academic essays.",
  },
  {
    id: "one_of_the_singular",
    category: "grammar",
    severity: "medium",
    pattern: /\bone\s+of\s+the\s+(reason|factor|example|cause|problem|benefit|cost|market|firm|policy)\b/gi,
    getSuggestion: (m) => `${m[0]}s`,
    explanation: "Use a plural noun after 'one of the'.",
  },
  {
    id: "misconception_inferior_good_quality",
    category: "misconception",
    severity: "high",
    pattern: /\binferior\s+goods?\s+(?:are|means?)\s+(?:poor|bad|low|substandard)\s+quality\b/gi,
    getSuggestion: () => "inferior goods have negative income elasticity of demand (YED < 0)",
    explanation:
      "Inferior goods are defined strictly by income elasticity (YED < 0), not physical or subjective product quality.",
    evidence: "Cambridge IGCSE 0455: Inferior goods see demand contract as real income rises (YED < 0).",
  },
  {
    id: "misconception_free_goods_government",
    category: "misconception",
    severity: "high",
    pattern: /\bfree\s+goods?\s+(?:are|means?)\s+goods?\s+provided\s+free\s+by\s+(?:the\s+)?government\b/gi,
    getSuggestion: () => "merit goods or state-funded public goods",
    explanation:
      "Free goods have zero opportunity cost and infinite abundance (e.g. air). State-provided services are merit or public goods.",
    evidence: "Cambridge IGCSE 0455: Free goods have zero opportunity cost; government provisions require scarce resources.",
  },
  {
    id: "misconception_money_is_capital",
    category: "misconception",
    severity: "high",
    pattern: /\bmoney\s+is\s+(?:a|the)\s+factor\s+of\s+production\b/gi,
    getSuggestion: () => "capital consists of physical human-made aids to production (machinery/tools)",
    explanation:
      "Money (financial capital) facilitates exchange but is not a physical factor of production (land, labour, capital, enterprise).",
    evidence: "Cambridge IGCSE 0455: Capital as a factor of production comprises man-made physical productive equipment.",
  },
  {
    id: "misconception_inflation_is_high_prices",
    category: "misconception",
    severity: "medium",
    pattern: /\binflation\s+(?:is|means)\s+(?:when\s+prices\s+are\s+high|high\s+prices)\b/gi,
    getSuggestion: () => "inflation is a persistent increase in the general price level",
    explanation:
      "Inflation is the sustained rate of increase in average prices over time, not an absolute high price level.",
    evidence: "Cambridge IGCSE 0455: Inflation is a sustained percentage increase in the general price level (CPI).",
  },
  {
    id: "homophone_there_possessive",
    category: "grammar",
    severity: "high",
    pattern:
      /\bthere\s+(essay|essays|price|prices|cost|costs|profit|profits|revenue|revenues|income|incomes|output|outputs|demand|supply|welfare|market|markets|consumer|consumers|firm|firms|worker|workers|product|products|good|goods|resource|resources|decision|decisions|utility|spending|investment|export|exports|import|imports|tax|taxes|subsidy|subsidies|budget|living\s+standards)\b/gi,
    getSuggestion: (m) => {
      const prefix = m[0][0] === "T" ? "Their" : "their";
      return `${prefix} ${m[1]}`;
    },
    explanation:
      "Use the possessive pronoun 'their' (not 'there') before a noun.",
  },
  {
    id: "typo_modal_br",
    category: "grammar",
    severity: "high",
    pattern: /\b(should|would|could|can|will|may|might|must|hsould|shoudl|woudl|coudl)\s+br\b/gi,
    getSuggestion: (m) => {
      const rawModal = m[1].toLowerCase();
      const fixedModal =
        rawModal === "hsould" || rawModal === "shoudl"
          ? "should"
          : rawModal === "woudl"
            ? "would"
            : rawModal === "coudl"
              ? "could"
              : rawModal;
      const casedModal = m[1][0] === m[1][0].toUpperCase() ? fixedModal[0].toUpperCase() + fixedModal.slice(1) : fixedModal;
      return `${casedModal} be`;
    },
    explanation: "Typo: 'br' should be 'be' after a modal verb.",
  },
  {
    id: "article_a_before_vowel_econ",
    category: "grammar",
    severity: "medium",
    pattern:
      /\b(a)\s+(increase|increasing|elastic|inelastic|external|externality|economy|economic|equilibrium|oligopoly|opportunity|aggregate|appreciation|asymmetric|import|inflationary|inferior|indirect|inefficient|inefficiency|intervention|investment)\b/gi,
    getSuggestion: (m) => {
      const article = m[1] === "A" ? "An" : "an";
      return `${article} ${m[2]}`;
    },
    explanation: "Use 'an' instead of 'a' before words starting with a vowel sound.",
  },
  {
    id: "article_an_before_consonant_econ",
    category: "grammar",
    severity: "medium",
    pattern:
      /\b(an)\s+(firm|tax|subsidy|tariff|quota|market|price|decrease|decreasing|monopoly|consumer|producer|government|good|service|shift|surplus|shortage|deficit|supply|demand|cost|benefit|negative|positive)\b/gi,
    getSuggestion: (m) => {
      const article = m[1] === "An" ? "A" : "a";
      return `${article} ${m[2]}`;
    },
    explanation: "Use 'a' instead of 'an' before words starting with a consonant sound.",
  },
  {
    id: "grammar_minimal_restriction_plural",
    category: "grammar",
    severity: "low",
    pattern: /\b(minimal|few|no)\s+restriction\s+such\s+as\b/gi,
    getSuggestion: (m) => `${m[1]} restrictions such as`,
    explanation:
      "Plural agreement: use plural 'restrictions' when followed by multiple examples ('such as tariffs and quotas').",
  },
  // ---- LAYER 5: Undeveloped AO2 Analysis Coaching (shallow claims stopping at definitions) ----
  {
    id: "shallow_specialisation_chain",
    category: "analysis",
    severity: "medium",
    pattern:
      /\bproducing\s+a\s+(?:limited|narrow)\s+range\s+of\s+(?:products|goods(?:\s+and\s+services)?)\b/i,
    getSuggestion: () =>
      "producing goods where they hold a comparative advantage (lower opportunity cost), exploiting economies of scale to lower average costs and reduce consumer prices",
    explanation:
      "AO2 Analysis needed: Defining specialisation earns AO1 Knowledge, but to earn AO2 Analysis marks you must explain the mechanism — how comparative advantage and economies of scale lower average costs, reduce prices, and raise consumer surplus or real GDP.",
    evidence:
      "Cambridge IGCSE 0455 AO2 requires developed causal chains linking specialisation via comparative advantage and economies of scale to lower costs, lower prices, and higher welfare.",
  },
  {
    id: "shallow_free_trade_benefit_claim",
    category: "analysis",
    severity: "medium",
    pattern:
      /\bfree\s+trade\s+(?:is|can\s+be)\s+(?:always\s+)?(?:positive|beneficial|good)\s+for\s+(?:an?\s+)?(?:economy|countries|consumers)\b/i,
    getSuggestion: () =>
      "free trade raises economic welfare by enabling specialisation according to comparative advantage, expanding world output and lowering domestic prices",
    explanation:
      "AO2 Analysis needed: Avoid bare assertions that free trade is positive; state the exact transmission mechanism (comparative advantage, lower import prices, consumer surplus, and outward shift of AD/AS).",
  },
  {
    id: "shallow_policy_good_bad_claim",
    category: "analysis",
    severity: "medium",
    pattern:
      /\b(subsidies|tariffs|quotas|indirect\s+taxes|fiscal\s+policy|monetary\s+policy|supply-side\s+policies)\s+(?:are|is)\s+(?:very\s+)?(?:good|bad|beneficial|harmful|positive|negative)\s+for\s+(?:the\s+|an\s+)?(?:economy|consumers|firms|government)\b/i,
    getSuggestion: (m) =>
      `${m[1]} shift market incentives and resource allocation, impacting price, output, and economic welfare`,
    explanation:
      "AO2 Analysis needed: Replace general 'good/bad for the economy' assertions with a step-by-step causal chain showing which curve shifts (Demand, Supply, AD, or AS) and how equilibrium price and output adjust.",
  },
];

export const COMMON_TYPOS: Readonly<Record<string, string>> = {
  // User-tested & high-frequency keyboard / transposition typos
  tkaing: "taking",
  takign: "taking",
  ffeedback: "feedback",
  feeback: "feedback",
  feedbakc: "feedback",
  feedabck: "feedback",
  hsould: "should",
  shoudl: "should",
  shuold: "should",
  houdl: "should",
  sould: "should",
  woudl: "would",
  wuold: "would",
  coudl: "could",
  cuold: "could",
  adpated: "adapted",
  adpapt: "adapt",
  chekci: "check",
  chekcing: "checking",
  chcek: "check",
  cehck: "check",
  amrks: "marks",
  amrk: "mark",
  makrs: "marks",
  mraks: "marks",
  fetaure: "feature",
  feauture: "feature",
  feaure: "feature",
  fetaures: "features",
  exmianer: "examiner",
  emxinar: "examiner",
  examnier: "examiner",
  exmainers: "examiners",
  grmmar: "grammar",
  grammer: "grammar",
  gramar: "grammar",
  teh: "the",
  hte: "the",
  taht: "that",
  tath: "that",
  thsi: "this",
  tihs: "this",
  wiht: "with",
  wtih: "with",
  waht: "what",
  hwat: "what",
  wihch: "which",
  whcih: "which",
  whihc: "which",
  highligh: "highlight",
  highligt: "highlight",
  higlight: "highlight",
  evalaution: "evaluation",
  evalutaion: "evaluation",
  evluation: "evaluation",
  evalauate: "evaluate",
  possibel: "possible",
  posible: "possible",
  possbile: "possible",
  mamxiser: "maximiser",
  mamxise: "maximise",
  maximser: "maximiser",
  bascially: "basically",
  basciallys: "basically",
  basicaly: "basically",
  basicly: "basically",
  diea: "idea",
  idae: "idea",
  delpoy: "deploy",
  depoly: "deploy",
  evryhting: "everything",
  everyting: "everything",
  evreything: "everything",
  strucutres: "structures",
  strucutre: "structure",
  struture: "structure",
  stucture: "structure",
  methdos: "methods",
  metohds: "methods",
  mehtods: "methods",
  accuracys: "accuracy",
  acuracy: "accuracy",
  acccuracy: "accuracy",
  acurate: "accurate",
  accurat: "accurate",
  ging: "giving",
  givng: "giving",
   quicky: "quickly",
  quikcly: "quickly",
  qucik: "quick",
  quikc: "quick",
  wrting: "writing",
  writng: "writing",
  wriitng: "writing",
  deedback: "feedback",
  ther: "their",
  thier: "their",
  theri: "their",
  themselfs: "themselves",
  alwasy: "always",
  alwyas: "always",
  alsot: "also",
  aslo: "also",
  beacause: "because",
  becuase: "because",
  becasue: "because",
  beacuse: "because",
  becouse: "because",
  howver: "however",
  howevre: "however",
  hwoever: "however",
  therfore: "therefore",
  therefor: "therefore",
  theerfore: "therefore",
  furhtermore: "furthermore",
  futhermore: "furthermore",
  morever: "moreover",
  morover: "moreover",
  consequenlty: "consequently",
  conseqeuntly: "consequently",
  additonally: "additionally",
  aditional: "additional",
  altough: "although",
  althought: "although",
  thoough: "though",
  thoguh: "though",
  espeically: "especially",
  especialy: "especially",
  particuarly: "particularly",
  particulary: "particularly",
  usuallly: "usually",
  usally: "usually",
  generaly: "generally",
  genrally: "generally",
  approximatly: "approximately",
  aproximately: "approximately",
  completlely: "completely",
  completly: "completely",
  entirly: "entirely",
  relativly: "relatively",
  relativley: "relatively",
  substantally: "substantially",
  considertably: "considerably",
  // Economics & Cambridge IGCSE 0455 core vocabulary typos
  cosumered: "consumed",
  goverment: "government",
  fimrm: "firm",
  fimrs: "firms",
  frim: "firm",
  frims: "firms",
  maxmise: "maximise",
  maximse: "maximise",
  maxmize: "maximize",
  minmise: "minimise",
  minimse: "minimise",
  minmize: "minimize",
  revnuue: "revenue",
  revenu: "revenue",
  reveneu: "revenue",
  resposive: "responsive",
  responsiv: "responsive",
  chnages: "changes",
  chagnes: "changes",
  chages: "changes",
  differntiate: "differentiate",
  diferentiate: "differentiate",
  differenciate: "differentiate",
  liek: "like",
  liekd: "liked",
  faliure: "failure",
  faliures: "failures",
  failur: "failure",
  externailties: "externalities",
  externailty: "externality",
  externalites: "externalities",
  exteranlities: "externalities",
  extrenalities: "externalities",
  extrenality: "externality",
  inelastc: "inelastic",
  elasticty: "elasticity",
  elastcity: "elasticity",
  elatsicity: "elasticity",
  elsticity: "elasticity",
  equillibrium: "equilibrium",
  equilibirum: "equilibrium",
  equlibrium: "equilibrium",
  equilbrium: "equilibrium",
  equilbirum: "equilibrium",
  disequilbrium: "disequilibrium",
  disequilibruim: "disequilibrium",
  oppurtunity: "opportunity",
  oportunity: "opportunity",
  opprotunity: "opportunity",
  govrenment: "government",
  governmnet: "government",
  govnerment: "government",
  consumr: "consumer",
  consumrs: "consumers",
  cosnumers: "consumers",
  comsumers: "consumers",
  consumptoin: "consumption",
  conusmption: "consumption",
  monoploy: "monopoly",
  monoply: "monopoly",
  monpoly: "monopoly",
  monopolstic: "monopolistic",
  inflatoin: "inflation",
  inflaton: "inflation",
  infaltion: "inflation",
  deflatoin: "deflation",
  disinflatoin: "disinflation",
  subsidie: "subsidy",
  subsidies: "subsidies",
  subsidey: "subsidy",
  subisdy: "subsidy",
  subisdies: "subsidies",
  subsdies: "subsidies",
  effeciency: "efficiency",
  efficency: "efficiency",
  effiency: "efficiency",
  ineffciency: "inefficiency",
  inefficency: "inefficiency",
  ineffeciency: "inefficiency",
  allocaive: "allocative",
  alloctaive: "allocative",
  productve: "productive",
  produtive: "productive",
  aggreagte: "aggregate",
  agregate: "aggregate",
  aggergate: "aggregate",
  unemploymnet: "unemployment",
  unemploymnt: "unemployment",
  unemployemnt: "unemployment",
  unempolyment: "unemployment",
  asymetric: "asymmetric",
  asymmteric: "asymmetric",
  diseconmies: "diseconomies",
  econmies: "economies",
  macroeconmic: "macroeconomic",
  macroeconomc: "macroeconomic",
  microeconmic: "microeconomic",
  microeconomc: "microeconomic",
  protecionism: "protectionism",
  protectonism: "protectionism",
  appreciaton: "appreciation",
  apreciation: "appreciation",
  investemnt: "investment",
  prodution: "production",
  produtcion: "production",
  demnd: "demand",
  dmeand: "demand",
  suply: "supply",
  spply: "supply",
  pricse: "prices",
  prcie: "price",
  prcies: "prices",
  tarifs: "tariffs",
  tarif: "tariff",
  welfaree: "welfare",
  wlefare: "welfare",
  deadwieght: "deadweight",
  deadweigt: "deadweight",
  multipler: "multiplier",
  multipiler: "multiplier",
  acclerator: "accelerator",
  ceterus: "ceteris",
  parabus: "paribus",
  sustanable: "sustainable",
  sustainble: "sustainable",
  competion: "competition",
  competetion: "competition",
  intervetion: "intervention",
  intervension: "intervention",
  produciton: "production",
  porduction: "production",
  producitvity: "productivity",
  allcoation: "allocation",
  allocaton: "allocation",
  determinte: "determine",
  stragetic: "strategic",
  startegic: "strategic",
  stratergy: "strategy",
  stratagy: "strategy",
  yeild: "yield",
  yeilds: "yields",
  defict: "deficit",
  deficet: "deficit",
  suplus: "surplus",
  surlus: "surplus",
  tarrif: "tariff",
  tarrifs: "tariffs",
  privatisation: "privatisation",
  privitisation: "privatisation",
  comodity: "commodity",
  comodities: "commodities",
  neccessary: "necessary",
  necesary: "necessary",
  seperate: "separate",
  definately: "definitely",
  untill: "until",
  recieve: "receive",
  occured: "occurred",
  occuring: "occurring",
  occurance: "occurrence",
  enviroment: "environment",
  beneifit: "benefit",
  beneifits: "benefits",
  benefite: "benefit",
  signficant: "significant",
  signifcant: "significant",
  signifacnt: "significant",
  inelasticly: "inelastically",
  elasticly: "elastically",
  subsitute: "substitute",
  subsitutes: "substitutes",
  catagorise: "categorise",
  catagories: "categories",
  responsivness: "responsiveness",
  responsivnes: "responsiveness",
  resposiveness: "responsiveness",
  allign: "align",
  alligned: "aligned",
  argumen: "argument",
  argumet: "argument",
  evalution: "evaluation",
  evaluaton: "evaluation",
  conclution: "conclusion",
  conclussion: "conclusion",
  abscence: "absence",
  apropriate: "appropriate",
  accomodate: "accommodate",
  acheive: "achieve",
  adress: "address",
  agressive: "aggressive",
  alocate: "allocate",
  alocation: "allocation",
  anual: "annual",
  apparant: "apparent",
  arguement: "argument",
  assumtion: "assumption",
  averege: "average",
  avaliable: "available",
  balence: "balance",
  beleive: "believe",
  benifit: "benefit",
  bussiness: "business",
  capatal: "capital",
  catagory: "category",
  compeititon: "competition",
  competative: "competitive",
  comparitive: "comparative",
  compeating: "competing",
  concensus: "consensus",
  consistant: "consistent",
  consumtion: "consumption",
  contrey: "country",
  cotnrol: "control",
  curency: "currency",
  curent: "current",
  decrese: "decrease",
  decreasse: "decrease",
  demad: "demand",
  demnad: "demand",
  depreciaton: "depreciation",
  dependant: "dependent",
  developement: "development",
  diferent: "different",
  diffrent: "different",
  dimishing: "diminishing",
  disposible: "disposable",
  distrubution: "distribution",
  econmy: "economy",
  econmic: "economic",
  econimic: "economic",
  economis: "economics",
  ecnomic: "economic",
  effecient: "efficient",
  effecive: "effective",
  elastisity: "elasticity",
  emplyment: "employment",
  employes: "employees",
  enterprize: "enterprise",
  equilibruim: "equilibrium",
  exchage: "exchange",
  exhange: "exchange",
  existance: "existence",
  expendature: "expenditure",
  expenditue: "expenditure",
  experiance: "experience",
  explaination: "explanation",
  exteral: "external",
  extrenal: "external",
  feasable: "feasible",
  fisical: "fiscal",
  flucuation: "fluctuation",
  foriegn: "foreign",
  fourty: "forty",
  goverments: "governments",
  governmnt: "government",
  gaurantee: "guarantee",
  harware: "hardware",
  immediatly: "immediately",
  importent: "important",
  imporve: "improve",
  incentve: "incentive",
  incom: "income",
  increse: "increase",
  increas: "increase",
  indivdual: "individual",
  industy: "industry",
  inferor: "inferior",
  inflaiton: "inflation",
  infastructure: "infrastructure",
  insurence: "insurance",
  intrest: "interest",
  intrests: "interests",
  invesment: "investment",
  investmnet: "investment",
  knowlege: "knowledge",
  liquidty: "liquidity",
  maintainance: "maintenance",
  managment: "management",
  margnial: "marginal",
  marketting: "marketing",
  measurment: "measurement",
  minumum: "minimum",
  maxiumum: "maximum",
  mininum: "minimum",
  monatary: "monetary",
  nessecary: "necessary",
  neccesary: "necessary",
  negativ: "negative",
  noticable: "noticeable",
  occurr: "occur",
  oligopolly: "oligopoly",
  opertunity: "opportunity",
  oppertunity: "opportunity",
  oppurtunities: "opportunities",
  outher: "other",
  overal: "overall",
  paralel: "parallel",
  percentge: "percentage",
  percetage: "percentage",
  perfomance: "performance",
  personaly: "personally",
  planing: "planning",
  policys: "policies",
  poluution: "pollution",
  populaton: "population",
  positve: "positive",
  possibilty: "possibility",
  potental: "potential",
  predicton: "prediction",
  priviledge: "privilege",
  proffit: "profit",
  profitt: "profit",
  publically: "publicly",
  quantaty: "quantity",
  quantiy: "quantity",
  questionaire: "questionnaire",
  realted: "related",
  reccomend: "recommend",
  recomend: "recommend",
  reducton: "reduction",
  refered: "referred",
  relevent: "relevant",
  repetetive: "repetitive",
  requirment: "requirement",
  resourse: "resource",
  resourses: "resources",
  responsability: "responsibility",
  revene: "revenue",
  sacrfice: "sacrifice",
  sacrifise: "sacrifice",
  scarsity: "scarcity",
  scarcety: "scarcity",
  shoratge: "shortage",
  shortge: "shortage",
  similiar: "similar",
  sucess: "success",
  succesful: "successful",
  sufficent: "sufficient",
  suppy: "supply",
  supplly: "supply",
  suprlus: "surplus",
  sustainabilty: "sustainability",
  taxaton: "taxation",
  technolgy: "technology",
  temprary: "temporary",
  thier: "their",
  threshhold: "threshold",
  tommorow: "tomorrow",
  tradeing: "trading",
  transfered: "transferred",
  transmision: "transmission",
  unamployment: "unemployment",
  unfortunatly: "unfortunately",
  useage: "usage",
  utilty: "utility",
  valueable: "valuable",
  varible: "variable",
  wealthly: "wealthy",
  wellfare: "welfare",
  wich: "which",
  wether: "whether",
  wheras: "whereas",
  writting: "writing",
};

const CORE_TARGET_WORDS: ReadonlySet<string> = (() => {
  const set = new Set<string>();
  for (const val of Object.values(COMMON_TYPOS)) {
    const clean = val.trim().toLowerCase();
    if (/^[a-z]{4,}$/.test(clean)) set.add(clean);
  }
  for (const phrase of CAMBRIDGE_ECONOMICS_WHITELIST) {
    for (const token of phrase.toLowerCase().split(/\s+/)) {
      if (/^[a-z]{5,}$/.test(token)) set.add(token);
    }
  }
  return set;
})();

function findFastFuzzyCorrection(lowerWord: string): string | undefined {
  if (lowerWord.length < 5 || CORE_TARGET_WORDS.has(lowerWord)) return undefined;

  // 1. Accidental leading double letter (e.g. "ffeedback" -> "feedback", "ddemand" -> "demand")
  if (lowerWord[0] === lowerWord[1]) {
    const stripped = lowerWord.slice(1);
    if (CORE_TARGET_WORDS.has(stripped)) return stripped;
  }

  // 2. Single adjacent character transposition on words >= 5 chars
  const chars = lowerWord.split("");
  for (let i = 0; i < chars.length - 1; i++) {
    if (chars[i] === chars[i + 1]) continue;
    const tmp = chars[i];
    chars[i] = chars[i + 1];
    chars[i + 1] = tmp;
    const candidate = chars.join("");
    // Restore before returning
    chars[i + 1] = chars[i];
    chars[i] = tmp;
    if (CORE_TARGET_WORDS.has(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function preserveCase(original: string, replacement: string): string {
  if (original === original.toUpperCase()) return replacement.toUpperCase();
  if (original[0] === original[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement.toLowerCase();
}

/**
 * Executes multi-layer deterministic grammar, clarity, and economic accuracy checks.
 * Detects exact character spans and filters false positives against the Cambridge whitelist.
 */
export function analyzeGrammarAndMechanics(sentences: string[]): GrammarRuleIssue[] {
  const issues: GrammarRuleIssue[] = [];
  const seenKeys = new Set<string>();

  for (const sentence of sentences) {
    const coveredSpans: Array<{ start: number; end: number }> = [];

    // 1. Check specialized Cambridge mechanics and misconception rules
    for (const rule of RULES) {
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(sentence)) !== null) {
        const matchedText = match[0];
        // Absolute safeguard: Capital 'I' is always valid and must never be flagged
        if (matchedText === "I") {
          if (!regex.global) break;
          continue;
        }
        const lowerMatched = matchedText.toLowerCase().trim();

        if (CAMBRIDGE_ECONOMICS_WHITELIST.has(lowerMatched)) {
          if (!regex.global) break;
          continue;
        }
        if (
          rule.id === "sentence_starts_lowercase" &&
          (COMMON_TYPOS[lowerMatched] || findFastFuzzyCorrection(lowerMatched))
        ) {
          if (!regex.global) break;
          continue;
        }

        const suggestion = rule.getSuggestion(match);
        const dedupeKey = `${rule.id}::${sentence.trim().toLowerCase()}::${matchedText.toLowerCase()}::${match.index}`;

        if (!seenKeys.has(dedupeKey)) {
          seenKeys.add(dedupeKey);
          const startOffset = match.index;
          const endOffset = match.index + matchedText.length;
          if (rule.id === "typo_modal_br" || rule.id === "homophone_there_possessive") {
            coveredSpans.push({ start: startOffset, end: endOffset });
          }
          issues.push({
            original: matchedText,
            suggestion,
            category: rule.category,
            severity: rule.severity,
            explanation: rule.explanation,
            evidence: rule.evidence,
            context: sentence,
            ruleId: rule.id,
            startOffset,
            endOffset,
          });
        }

        if (!regex.global) break;
      }
    }

    // 2. High-speed, zero-token spelling & typo detection
    const wordRegex = /\b[A-Za-z]{2,}\b/g;
    let wordMatch: RegExpExecArray | null;
    while ((wordMatch = wordRegex.exec(sentence)) !== null) {
      const originalWord = wordMatch[0];
      const lowerWord = originalWord.toLowerCase();
      const wordStart = wordMatch.index;
      const wordEnd = wordStart + originalWord.length;

      if (CAMBRIDGE_ECONOMICS_WHITELIST.has(lowerWord)) continue;
      if (coveredSpans.some((s) => wordStart >= s.start && wordEnd <= s.end)) continue;

      const corrected = COMMON_TYPOS[lowerWord] ?? findFastFuzzyCorrection(lowerWord);
      if (corrected && corrected.toLowerCase() !== lowerWord) {
        const dedupeKey = `typo::${sentence.trim().toLowerCase()}::${originalWord.toLowerCase()}::${wordStart}`;
        if (!seenKeys.has(dedupeKey)) {
          seenKeys.add(dedupeKey);
          const suggestion = preserveCase(originalWord, corrected);
          issues.push({
            original: originalWord,
            suggestion,
            category: "grammar",
            severity: "high",
            explanation: `Spelling typo: '${originalWord}' should be '${suggestion}'.`,
            context: sentence,
            ruleId: `typo_${lowerWord}`,
            startOffset: wordStart,
            endOffset: wordEnd,
          });
        }
      }
    }
  }

  return issues;
}
