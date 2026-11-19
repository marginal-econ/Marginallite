import {
  LayoutDashboard,
  PenLine,
  ListChecks,
  FileSpreadsheet,
  Wand2,
  GraduationCap,
  Sparkles,
  Flame,
  BookText,
  BookMarked,
  LineChart,
  Target,
  Trophy,
  ClipboardCheck,
  UsersRound,
  BookOpen,
  MessageSquare,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface TutorialStep {
  step: number;
  title: string;
  description: string;
  proTip: string;
  actionHint?: string;
  badge?: string;
}

export interface FeatureTutorial {
  id: string;
  title: string;
  navLabel: string;
  routePrefix: string;
  category:
    "Dashboard" | "Exam Practice" | "Syllabus Resources" | "Classroom & Diagnostics" | "Account";
  paperTag?: string; // e.g. "Paper 2", "Paper 1 & 3"
  estimatedTime: string;
  icon: LucideIcon;
  summary: string;
  whatItDoes: string[];
  cambridgeExaminerInsight: string;
  steps: TutorialStep[];
  directUrl: string;
}

export const FEATURE_TUTORIALS: FeatureTutorial[] = [
  {
    id: "dashboard",
    title: "Cambridge IGCSE 0455 Dashboard",
    navLabel: "Dashboard",
    routePrefix: "/dashboard",
    category: "Dashboard",
    estimatedTime: "60 sec read",
    icon: LayoutDashboard,
    summary:
      "Your personalized Cambridge IGCSE 0455 flight deck. Track your syllabus coverage, projected grade band, writing streak, and recent evaluation metrics in real time.",
    whatItDoes: [
      "Real-time Cambridge IGCSE 0455 syllabus readiness score computed across all units",
      "Historical essay score progression curve calibrated to official grade thresholds",
      "Microeconomics vs. Macroeconomics performance balance radar",
      "Daily practice streak counter to maintain consistent exam readiness",
      "One-click launchpads to all exam papers, generators, and diagnostics",
    ],
    cambridgeExaminerInsight:
      "Cambridge examiners report that top candidates balance Micro and Macro revision evenly. Use your dashboard radar chart to spot weak syllabus sections before exam season.",
    directUrl: "/dashboard",
    steps: [
      {
        step: 1,
        title: "Review Syllabus Readiness & Projected Grade",
        description:
          "The top cards display your Cambridge readiness index, estimated letter grade (A* through E), total essays marked, and current study streak. This updates automatically whenever you submit essays or complete MCQ papers.",
        proTip:
          "Aim to keep your readiness score above 85% to securely target an A* in Cambridge IGCSE 0455.",
        badge: "Overview",
      },
      {
        step: 2,
        title: "Analyze Micro vs. Macro Balance",
        description:
          "Scroll down to see your Micro vs Macro mastery split. Cambridge Paper 1 and Paper 2 demand deep competency across both halves — this tracker alerts you if you are neglecting macroeconomic policies or market failure theory.",
        proTip:
          "Check your AO2 (Analysis) breakdown: high-scoring students consistently connect micro market mechanisms to macro aggregate impacts.",
        badge: "Diagnostics",
      },
      {
        step: 3,
        title: "Access Recent Essays & Quick Launchpads",
        description:
          "Click any recent submission to reopen the full mark breakdown, annotated feedback, and model improvements. Use the quick action shortcuts to jump right into grading or MCQ past papers.",
        proTip:
          "Always re-read past examiner commentary before starting a new timed practice essay.",
        badge: "Shortcuts",
      },
    ],
  },
  {
    id: "grade",
    title: "Grade Unlimited Essays",
    navLabel: "Grade Essays",
    routePrefix: "/grade",
    category: "Exam Practice",
    paperTag: "Paper 2 (2m, 4m, 6m, 8m)",
    estimatedTime: "90 sec read",
    icon: PenLine,
    summary:
      "Instant, rigorous automated evaluation calibrated to official Cambridge IGCSE 0455 mark schemes and examiner reports. Supports both typed text and handwritten photo uploads with OCR.",
    whatItDoes: [
      "Select past paper essay prompts (Paper 2) or input custom school questions",
      "Supports 2-mark, 4-mark, 6-mark, and 8-mark essay structures",
      "Paste typed answers or upload photos of handwritten sheets using built-in OCR",
      "Instant AO1 (Knowledge), AO2 (Analysis), and AO3 (Evaluation) marks",
      "Line-by-line examiner commentary, rubric band placement, and rewritten exemplar paragraphs",
      "Automatic storage into your student diagnostic portfolio",
    ],
    cambridgeExaminerInsight:
      "Examiners award Level 3 (Top Band) exclusively to essays with substantiated evaluation. Never write a one-sentence conclusion; weigh conflicting economic arguments and state 'it depends on' factors.",
    directUrl: "/grade",
    steps: [
      {
        step: 1,
        title: "Choose or Enter Your Essay Question",
        description:
          "Select a past paper question from the Cambridge repository (sorted by Year, Session, Paper, and Marks) or choose 'Custom Question' to type any school homework or mock exam prompt.",
        proTip:
          "Ensure you pick the correct mark tariff (2, 4, 6, or 8 marks). The AI dynamically adjusts its Cambridge rubric weighting accordingly.",
        badge: "Step 1: Question",
      },
      {
        step: 2,
        title: "Submit Answer (Typed or Handwritten OCR)",
        description:
          "Type or paste your essay directly into the distraction-free editor. Alternatively, click 'Upload Handwritten Essay' to snap pictures of your written exam booklet. The high-precision OCR transcribes it into editable text.",
        proTip:
          "Review the transcribed text after OCR to verify any economic abbreviations or technical terms before grading.",
        badge: "Step 2: Submission",
      },
      {
        step: 3,
        title: "Receive Instant Cambridge AO1–AO3 Breakdown",
        description:
          "Click 'Grade Essay'. Within seconds, you'll receive your total score, Cambridge Level descriptors (Level 1 to Level 3), individual marks for Knowledge, Analysis, and Evaluation, plus specific tips for moving up a level.",
        proTip:
          "Pay special attention to the 'Evaluative Judgement' feedback — this is where most candidates drop marks from A to B.",
        badge: "Step 3: Feedback",
      },
      {
        step: 4,
        title: "Study Annotated Model Improvements",
        description:
          "Read the annotated feedback highlighting weak chains of reasoning. Expand the 'Model Revision' to see how an official Cambridge examiner would rewrite your paragraphs to achieve full marks.",
        proTip:
          "Rewrite your essay incorporating the suggestions to cement the analytical chains into your memory.",
        badge: "Step 4: Improvement",
      },
    ],
  },
  {
    id: "mcq-live",
    title: "MCQ Past Papers Simulator",
    navLabel: "MCQ Past Papers",
    routePrefix: "/mcq-live",
    category: "Exam Practice",
    paperTag: "Paper 1 (Multiple Choice)",
    estimatedTime: "75 sec read",
    icon: ListChecks,
    summary:
      "Full Cambridge IGCSE 0455 Multiple Choice simulator with timed exam modes, instant mark calculation, detailed question-by-question explanations, and historical performance tracking.",
    whatItDoes: [
      "Access complete past papers from 2010 through recent series for Paper 1 and Paper 1",
      "Real exam timer countdown (1 hour for 30 questions) with pause and resume",
      "Instant mark scheme grading upon submission with correct option highlights",
      "Exhaustive explanations breaking down why the correct option is right and distractors are wrong",
      "Topic filter to drill down on specific micro or macro question types",
      "Bookmark difficult questions to review before your real exam",
    ],
    cambridgeExaminerInsight:
      "In Cambridge IGCSE 0455 MCQ papers, each question is worth 1 mark. Top candidates allocate exactly 2 minutes per question and use elimination of distractors on tricky elasticity and national income calculations.",
    directUrl: "/mcq-live",
    steps: [
      {
        step: 1,
        title: "Select Paper & Exam Series",
        description:
          "Choose between Paper 1 (IGCSE 0455, 30 questions) and Paper 1 (IGCSE Level, 30 questions). Filter by exam year, variant (Variant 1, 2, or 3), and series (May/June or Oct/Nov).",
        proTip:
          "Variant 2 is the most commonly sat paper internationally; start with Variant 2 papers for standard syllabus coverage.",
        badge: "Selection",
      },
      {
        step: 2,
        title: "Simulate Real Exam Conditions",
        description:
          "Start the timer to simulate real exam room pressure. Use the question navigator palette to jump between questions, flag doubts for later review, and mark answers cleanly.",
        proTip:
          "Keep an eye on the countdown clock. If a numerical question takes longer than 2.5 minutes, flag it and return at the end.",
        badge: "Practice",
      },
      {
        step: 3,
        title: "Review Cambridge Explanations",
        description:
          "Submit your paper to get your scaled score and grade boundary equivalent. Click on any question to view the step-by-step logic, calculation breakdown, and rationale for every distractor choice.",
        proTip:
          "Log every question you missed into your personal notebook to avoid repeating the same conceptual trap.",
        badge: "Analysis",
      },
    ],
  },
  {
    id: "data-response",
    title: "Data Response Papers Studio",
    navLabel: "Data Response",
    routePrefix: "/data-response",
    category: "Exam Practice",
    paperTag: "Paper 2 Section A (Data Response)",
    estimatedTime: "80 sec read",
    icon: FileSpreadsheet,
    summary:
      "Master the compulsory Section A case studies for Cambridge IGCSE 0455 Paper 2 (20 marks) and Paper 2 (20 marks). Practice interpreting real-world extracts, tables, and charts with structured rubrics.",
    whatItDoes: [
      "Real Cambridge extracts, case studies, statistical tables, and economic graphs",
      "Progressive subquestions from 2-mark calculations to 8-mark evaluative conclusions",
      "Integrated extract viewer so you never have to juggle multiple browser windows or papers",
      "Rubric-calibrated evaluation tailored to Cambridge data-handling criteria",
      "Guidance on using extract quotes and numerical evidence to secure AO2 marks",
    ],
    cambridgeExaminerInsight:
      "The #1 mistake in Section A is writing generic textbook theory without quoting the extract. Cambridge examiners require explicit data citations (percentages, figures, dates) to award Level 3/4 Application marks.",
    directUrl: "/data-response",
    steps: [
      {
        step: 1,
        title: "Inspect the Extract & Data Visuals",
        description:
          "Read through the real-world economic scenario in the left-hand panel. Pay close attention to percentages, base years in index numbers, and directional shifts in tables or charts.",
        proTip: "Highlight key statistical data points before looking at the subquestions.",
        badge: "Data Reading",
      },
      {
        step: 2,
        title: "Answer Progressive Subquestions",
        description:
          "Work through part (a) through part (d). Notice the mark tariffs: 2m/3m questions test definitions & direct extract retrieval, while 6m/8m questions require two-sided analysis and supported evaluation.",
        proTip:
          "For 2-mark questions, keep answers concise: definition + 1 extract citation is often sufficient.",
        badge: "Answering",
      },
      {
        step: 3,
        title: "Compare Against Cambridge Mark Schemes",
        description:
          "Review the sample answers, expected points from CIE examiner reports, and acceptable alternative economic reasoning.",
        proTip:
          "Notice how high-scoring answers weave data directly into the analytical chain rather than tacking it on at the end.",
        badge: "Mark Scheme",
      },
    ],
  },
  {
    id: "essay-generator",
    title: "Sample Essay Generator",
    navLabel: "Essay Generator",
    routePrefix: "/essay-generator",
    category: "Exam Practice",
    paperTag: "AI Model Exemplars",
    estimatedTime: "60 sec read",
    icon: Wand2,
    summary:
      "Generate Cambridge IGCSE 0455 Level 3 (Top Band) distinction-grade exemplar essays on demand. Learn how top students structure chains of analysis, incorporate diagrams, and execute nuanced evaluations.",
    whatItDoes: [
      "Select syllabus level: Cambridge IGCSE 0455 (2, 4, 6, or 8 marks)",
      "Choose from popular past paper topics or enter any custom prompt",
      "Generates clear, step-by-step PEEL / KAA paragraph architectures",
      "Includes diagram descriptions and explicit labeling references for exam scripts",
      "Demonstrates high-scoring evaluation techniques (assumptions, magnitude, short vs long run)",
      "One-click copy or export to your revision notes",
    ],
    cambridgeExaminerInsight:
      "Do not memorize essays word-for-word. Instead, dissect how the generator connects economic cause to consequence, and how it uses qualifying language in the evaluative conclusion.",
    directUrl: "/essay-generator",
    steps: [
      {
        step: 1,
        title: "Set Syllabus Level & Mark Tariff",
        description:
          "Select Cambridge IGCSE 0455 (Paper 2), and specify the mark allocation (2 marks, 4 marks, 6 marks, or 8 marks). The generator applies the exact Cambridge weighting for that paper.",
        proTip:
          "6-mark essays require pure analysis (AO2) with NO evaluation, whereas 8-mark discussion essays require substantive, balanced two-sided evaluation (AO3).",
        badge: "Setup",
      },
      {
        step: 2,
        title: "Choose Topic or Enter Question",
        description:
          "Pick from frequently tested micro or macro syllabus areas (e.g., market failure, exchange rates, monetary policy, comparative advantage) or type any custom essay prompt.",
        proTip:
          "Try entering a question that you found challenging in class to see how an examiner would tackle it.",
        badge: "Prompt",
      },
      {
        step: 3,
        title: "Study the Exemplar Architecture",
        description:
          "Examine the generated essay: notice the concise definition introduction, the structured analytical paragraphs with diagram explanations, and the nuanced evaluative conclusion.",
        proTip:
          "Highlight the transition words (e.g. 'Consequently', 'This leads to', 'However, the extent of this depends on') to improve your essay flow.",
        badge: "Study",
      },
    ],
  },
  {
    id: "response-structure",
    title: "How to Write an Essay (Response Architecture)",
    navLabel: "Essay Guide",
    routePrefix: "/response-structure",
    category: "Exam Practice",
    paperTag: "Cambridge IGCSE 0455 Writing Framework",
    estimatedTime: "75 sec read",
    icon: GraduationCap,
    summary:
      "The definitive masterclass on constructing Cambridge IGCSE 0455 essays. Learn the PEEL & KAA frameworks, exam room timing strategies, and how to reliably hit Level 4 and Level 5 bands.",
    whatItDoes: [
      "Complete breakdown of Cambridge Assessment Objectives: AO1, AO2, AO3, and AO4",
      "Timing blueprints: 45 minutes per essay in Paper 2 & Paper 2",
      "Paragraph formulas: Knowledge, Analysis, and Evaluation",
      "Evaluation triggers: 'It depends on...', 'In the short run vs long run', 'Magnitude & Elasticity'",
      "Examiner report pitfalls and common traps that cause candidates to lose marks",
    ],
    cambridgeExaminerInsight:
      "Candidates who score Level 5 spend the first 3 to 5 minutes planning their essay structure. A clear plan prevents contradictory arguments and ensures a balanced, substantiated conclusion.",
    directUrl: "/response-structure",
    steps: [
      {
        step: 1,
        title: "Understand AO Weightings & Band Descriptors",
        description:
          "Cambridge marks are divided into 4 Assessment Objectives: AO1 (Knowledge & Understanding), AO2 (Application to context), AO3 (Analysis / cause-and-effect chains), and AO4 (Evaluation & judgement). Knowing the weightings tells you how much space to dedicate to each.",
        proTip: "On 12-mark and 20-mark essays, AO3 and AO4 carry over 60% of total marks.",
        badge: "Objectives",
      },
      {
        step: 2,
        title: "Master the 45-Minute Exam Pacing Blueprint",
        description:
          "Allocate your time strictly: 5 minutes planning, 15 minutes on the primary analytical argument, 12 minutes on the counter-argument/alternative policy, 8 minutes on the evaluative conclusion, and 5 minutes proofreading.",
        proTip: "Never skip the planning stage — unorganized essays rarely achieve above Level 2.",
        badge: "Pacing",
      },
      {
        step: 3,
        title: "Apply Proven Evaluation Triggers",
        description:
          "Learn the 5 golden evaluation angles: 1) Elasticity of supply/demand, 2) Time lag (short run vs long run), 3) Opportunity cost & government failure, 4) Magnitude of the shock or policy, and 5) Conflicting macroeconomic objectives.",
        proTip:
          "Use phrases like 'The effectiveness of this monetary policy will fundamentally hinge upon consumer confidence...' to signal high-level evaluation.",
        badge: "Evaluation",
      },
    ],
  },
  {
    id: "paper-matrix",
    title: "15-Year Paper Predictor & Matrix",
    navLabel: "Paper Predictor",
    routePrefix: "/paper-matrix",
    category: "Syllabus Resources",
    paperTag: "15-Year Exam Trends",
    estimatedTime: "70 sec read",
    icon: Flame,
    summary:
      "Data-driven analysis of 15 years of Cambridge IGCSE 0455 examination sessions. Uncover seasonal topic cycles, historical frequency distributions, and predicted high-probability topics for upcoming exams.",
    whatItDoes: [
      "Interactive 15-year historical heatmap covering May/June and Oct/Nov series",
      "Track cyclical frequency across all syllabus units (Micro & Macro)",
      "Identifies 'overdue' topics that haven't appeared in recent exam sittings",
      "Variant comparison: uncover differences between Variant 1, 2, and 3 papers",
      "Filter by paper type: Paper 1, Paper 2, Paper 1, and Paper 2",
    ],
    cambridgeExaminerInsight:
      "Cambridge exam setters rotate syllabus topics cyclically. While candidates must revise the full syllabus, knowing which topics are overdue helps prioritize high-yield essay practice in the final weeks.",
    directUrl: "/paper-matrix",
    steps: [
      {
        step: 1,
        title: "Explore the Syllabus Topic Heatmap",
        description:
          "The matrix plots every exam series against Cambridge IGCSE 0455 syllabus topics. Colors indicate the frequency and mark weighting of questions that appeared in each session.",
        proTip:
          "Notice how topics like 'Exchange Rate Systems' and 'Market Failure & Government Intervention' appear almost every other year.",
        badge: "Heatmap",
      },
      {
        step: 2,
        title: "Filter by Paper and Series",
        description:
          "Toggle between Paper 2 (AS Essay) and Paper 2 (IGCSE Essay). Switch variants to see what was tested in your specific geographic zone.",
        proTip:
          "Look at the preceding series (e.g. October/November) to see which topics were tested, as setters frequently alternate topics in May/June.",
        badge: "Filters",
      },
      {
        step: 3,
        title: "Review High-Probability Forecasts",
        description:
          "Check the 'Predicted Topics' section to see syllabus areas with the highest statistical probability of appearing in the upcoming examination window.",
        proTip:
          "Practice at least 2 full timed essays on each top predicted topic using the Grade Essays feature.",
        badge: "Predictions",
      },
    ],
  },
  {
    id: "definitions",
    title: "Definitions Hub & Glossary",
    navLabel: "Definitions Hub",
    routePrefix: "/definitions",
    category: "Syllabus Resources",
    paperTag: "Cambridge IGCSE 0455 Official Glossary",
    estimatedTime: "60 sec read",
    icon: BookText,
    summary:
      "The authoritative glossary of Cambridge IGCSE 0455 economic definitions, transcribed word-for-word from CIE mark schemes. Essential for banking automatic AO1 marks across all papers.",
    whatItDoes: [
      "Over 200+ Cambridge IGCSE 0455 definitions organized by syllabus chapters",
      "Exact examiner wording required for full 2-mark definitions in Section A & essays",
      "Interactive flashcard mode for active recall memorization",
      "Instant search with autocomplete and filter by AS vs IGCSE level",
      "One-click copy definition for seamless integration into your essays",
    ],
    cambridgeExaminerInsight:
      "In Cambridge IGCSE 0455, vague definitions lose marks immediately. For example, defining 'Opportunity Cost' as 'the next best alternative' gets 0 marks; you MUST include 'the benefit forgone of the next best alternative forgone'.",
    directUrl: "/definitions",
    steps: [
      {
        step: 1,
        title: "Search or Filter by Topic",
        description:
          "Use the instant search bar or select a syllabus unit (e.g., Basic Economic Ideas, The Price System, Government Intervention, International Trade) to view exact Cambridge definitions.",
        proTip: "Filter by 'AS Only' or 'IGCSE Only' depending on your upcoming examination level.",
        badge: "Search",
      },
      {
        step: 2,
        title: "Review Cambridge-Approved Phrasing",
        description:
          "Each definition card displays the official definition with bolded key terms that examiners scan for, plus common student errors to avoid.",
        proTip:
          "Memorize the bolded key phrases verbatim — examiners are instructed to look for these exact operative words.",
        badge: "Wording",
      },
      {
        step: 3,
        title: "Test Yourself with Flashcard Mode",
        description:
          "Switch to 'Flashcards' to practice active recall. Flip the cards to test whether you can recite the definition accurately without peeking.",
        proTip:
          "Review 10 flashcards every morning leading up to the exam for effortless long-term retention.",
        badge: "Recall",
      },
    ],
  },
  {
    id: "question-bank",
    title: "Past Paper Question Bank",
    navLabel: "Question Bank",
    routePrefix: "/question-bank",
    category: "Syllabus Resources",
    paperTag: "Paper 1 & Paper 2",
    estimatedTime: "60 sec read",
    icon: BookMarked,
    summary:
      "Extensive repository of Cambridge IGCSE 0455 past examination questions. Filter by syllabus topic, paper type, mark tariff, and year to find exactly the practice questions you need.",
    whatItDoes: [
      "Database of hundreds of official Cambridge past paper essay prompts and MCQ questions",
      "Filter by Micro vs Macro, Syllabus Section (1.1 to 6.4), Year, and Session",
      "Direct one-click link to launch any question straight into the Grade Essays tool",
      "View question popularity and historical appearance frequency",
      "Save favorite or difficult questions to your revision shortlist",
    ],
    cambridgeExaminerInsight:
      "Exam setters frequently recycle question stems with slight contextual variations. By practicing past questions across different years on the same topic, you will recognize the underlying economic model instantly.",
    directUrl: "/question-bank",
    steps: [
      {
        step: 1,
        title: "Filter by Syllabus Unit & Mark Tariff",
        description:
          "Select the specific syllabus area you are studying in class (e.g., Market Failure, Monopoly, Fiscal Policy). Filter by 8-mark, 12-mark, or 20-mark questions.",
        proTip:
          "Start with 8-mark questions to master clean analysis before moving up to 12m/20m evaluative prompts.",
        badge: "Filter",
      },
      {
        step: 2,
        title: "Inspect Question Stems & Command Words",
        description:
          "Notice the directive verbs used: 'Discuss', 'Assess', 'Explain'. The question bank highlights the command word so you understand the required answer structure.",
        proTip:
          "Pay close attention to qualifiers like 'Evaluate whether a decrease in interest rates is the MOST effective policy...' which requires comparing against other policies.",
        badge: "Stems",
      },
      {
        step: 3,
        title: "Launch Directly into Practice or Essay Grading",
        description:
          "Click 'Practice this Question' to load the prompt directly into the AI essay grader or Essay Grader with one tap.",
        proTip:
          "Set a 40-minute timer and write your answer under exam conditions for maximum preparation value.",
        badge: "Practice",
      },
    ],
  },
  {
    id: "diagrams",
    title: "Interactive Diagram Library",
    navLabel: "Diagram Library",
    routePrefix: "/diagrams",
    category: "Syllabus Resources",
    paperTag: "Cambridge IGCSE 0455 Core Diagrams",
    estimatedTime: "80 sec read",
    icon: LineChart,
    summary:
      "Interactive, fully labeled Cambridge IGCSE 0455 diagrams. Study step-by-step shifts, axis labeling requirements, shift versus movement rules, and avoid common diagram errors that cost marks.",
    whatItDoes: [
      "Complete library of Cambridge micro and macro diagrams (Externalities, Monopolies, AD/AS, Lorenz Curve, Tariffs, Phillips Curve, etc.)",
      "Interactive sliders and buttons showing shifts in demand, supply, AD, and SRAS/LRAS",
      "Clear labeling standards matching official CIE mark scheme conventions",
      "Explanatory notes detailing the economic cause, transition mechanism, and final equilibrium",
      "Common examiner traps: where students lose marks on axes, arrows, and areas",
    ],
    cambridgeExaminerInsight:
      "A diagram without correctly labeled axes, equilibrium points (e.g. P1, Q1, P2, Q2), and directional arrows receives ZERO application marks. Always reference your diagram directly in your text ('As shown in Figure 1, the supply curve shifts from S1 to S2...').",
    directUrl: "/diagrams",
    steps: [
      {
        step: 1,
        title: "Select Diagram by Syllabus Area",
        description:
          "Browse diagrams by topic: Market Equilibrium, Elasticity, Negative Externalities of Production, Monopoly Deadweight Loss, Macroeconomic AD/AS, Exchange Rate Shifts, and Trade Protectionism.",
        proTip: "Filter by AS vs IGCSE to focus on the specific models required for your exam paper.",
        badge: "Library",
      },
      {
        step: 2,
        title: "Step Through Dynamic Curve Shifts",
        description:
          "Use the interactive controls to trigger shifts. Observe how the equilibrium price, quantity, and welfare areas (consumer surplus, producer surplus, deadweight loss) change in response.",
        proTip:
          "Trace the adjustment process: explain why excess demand or supply at the initial price drives the price towards the new equilibrium.",
        badge: "Interactive",
      },
      {
        step: 3,
        title: "Memorize Cambridge Exam Labeling Rules",
        description:
          "Each diagram comes with a checklist of mandatory exam labels: axes names (e.g., 'Real GDP' not just 'Output', 'Average Price Level' not just 'Price'), curve identifiers, and shift arrows.",
        proTip: "Practice sketching the diagram from memory on blank paper in under 90 seconds.",
        badge: "Checklist",
      },
    ],
  },
  {
    id: "command-words",
    title: "Command Words Masterclass",
    navLabel: "Command Words",
    routePrefix: "/command-words",
    category: "Syllabus Resources",
    paperTag: "Cambridge Directive Verbs",
    estimatedTime: "60 sec read",
    icon: Target,
    summary:
      "Understand the exact Cambridge definitions of directive verbs: Assess, Discuss, Evaluate, Explain, Compare, and Calculate. Ensure your answer structure matches examiner expectations.",
    whatItDoes: [
      "Official Cambridge definitions for all 0455 directive verbs",
      "Clear guidelines on which command words require evaluation (AO4) and which do not",
      "Structural blueprints for each verb showing required paragraph count and focus",
      "Side-by-side comparison of 'Explain' vs 'Discuss' vs 'Assess'",
      "Checklist of warning signs where candidates lose marks by writing the wrong answer type",
    ],
    cambridgeExaminerInsight:
      "If a question says 'Explain', DO NOT evaluate! You waste precious exam time writing conclusions that earn zero marks. Conversely, if a question says 'Assess' or 'Discuss', an essay without evaluation can never exceed Level 3.",
    directUrl: "/command-words",
    steps: [
      {
        step: 1,
        title: "Identify Evaluation vs. Non-Evaluation Verbs",
        description:
          "Learn the division: 'Explain', 'Identify', 'Outline', and 'Calculate' are non-evaluative (AO1, AO2, AO3 only). 'Assess', 'Discuss', 'Evaluate', and 'To what extent' require two-sided analysis and a reasoned verdict (AO4).",
        proTip: "Circle the command word immediately when you open your exam paper.",
        badge: "Classification",
      },
      {
        step: 2,
        title: "Follow the Structural Blueprint",
        description:
          "Review the paragraph templates for each verb. For 'Discuss', provide points in favor, points against, and a justified conclusion. For 'Explain', provide sequential causal links without counter-arguments.",
        proTip: "Check the mark tariff alongside the command word to calibrate your answer depth.",
        badge: "Structure",
      },
      {
        step: 3,
        title: "Avoid Cambridge Examiner Report Pitfalls",
        description:
          "Read real examiner quotes illustrating how students lost marks by misinterpreting command words in past series.",
        proTip: "Review this guide the night before your exam to ensure proper exam technique.",
        badge: "Pitfalls",
      },
    ],
  },
  {
    id: "showcase",
    title: "Exemplars Showcase",
    navLabel: "Exemplars Showcase",
    routePrefix: "/showcase",
    category: "Syllabus Resources",
    paperTag: "Verified Level 3 (Top Band) Scripts",
    estimatedTime: "75 sec read",
    icon: Trophy,
    summary:
      "A curated collection of verified distinction-grade student essays that achieved Level 3 (Top Band) marks. Read real student scripts with examiner annotations and mark scheme breakdowns.",
    whatItDoes: [
      "Curated library of high-scoring real student essays across AS & IGCSE syllabus topics",
      "Full breakdown of marks awarded for AO1, AO2, AO3, and AO4 with examiner comments",
      "Anonymized using initials (e.g. 'S.K.') in compliance with platform privacy standards",
      "Filter by micro vs macro, paper type, and syllabus chapter",
      "Study real candidate analytical chains and evaluative conclusions",
    ],
    cambridgeExaminerInsight:
      "Reading exemplar essays is the fastest way to understand what Level 5 writing actually looks like. Pay attention to how distinction candidates transition smoothly between theory and real-world examples.",
    directUrl: "/showcase",
    steps: [
      {
        step: 1,
        title: "Browse Exemplars by Syllabus Area",
        description:
          "Filter by Microeconomics (e.g. Market Failure, Price Mechanism, Monopoly, Labor Markets) or Macroeconomics (e.g. Inflation, Unemployment, Fiscal Policy, Trade Balance).",
        proTip:
          "Look for essays that scored 11/12 or 18/20 to see the highest standard of execution.",
        badge: "Browse",
      },
      {
        step: 2,
        title: "Read Examiner Annotations",
        description:
          "Click on any essay script to view the line-by-line examiner commentary explaining exactly where marks were awarded for knowledge, analysis, and evaluation.",
        proTip:
          "Notice how the candidate uses economic terms naturally in context without unnecessary fluff.",
        badge: "Annotations",
      },
      {
        step: 3,
        title: "Analyze the Conclusion Technique",
        description:
          "Read the final paragraph carefully. Notice how top candidates do not merely repeat what was said earlier; they weigh the conflicting arguments and reach a clear, justified economic judgment.",
        proTip: "Adopt the concluding phrasing structures for your own practice essays.",
        badge: "Conclusions",
      },
    ],
  },
  {
    id: "review",
    title: "Analytics & Diagnostic Performance",
    navLabel: "Analytics",
    routePrefix: "/review",
    category: "Classroom & Diagnostics",
    paperTag: "AO1–AO3 Diagnostics",
    estimatedTime: "60 sec read",
    icon: ClipboardCheck,
    summary:
      "Deep diagnostic breakdown of your overall economic writing. Spot recurring analytical gaps, track your AO1–AO3 trends, and get targeted recommendations on where to focus your revision.",
    whatItDoes: [
      "Longitudinal performance tracking across all submitted essays and practice tests",
      "Individual scoring trends for AO1 (Knowledge), AO2 (Analysis), and AO3 (Evaluation)",
      "Identifies common weaknesses (e.g., 'Weak evaluation conclusions', 'Insufficient diagram explanations')",
      "Targeted study recommendations pointing you to specific syllabus guides and definitions",
      "Filter past evaluations by date, paper, score band, or topic",
    ],
    cambridgeExaminerInsight:
      "Most students plateau at a B grade because they continue writing Level 3 analysis without developing Level 4/5 evaluation skills. Your analytics page pinpoints your exact score ceiling so you know what to fix.",
    directUrl: "/review",
    steps: [
      {
        step: 1,
        title: "Review AO Trend Charts",
        description:
          "Inspect your historical trends for Knowledge, Analysis, and Evaluation. See which objective is lagging behind your target grade.",
        proTip:
          "If your AO2 (Analysis) is strong but AO4 (Evaluation) is low, spend more time studying evaluation frameworks in Response Structure.",
        badge: "Trends",
      },
      {
        step: 2,
        title: "Identify Recurring Weakness Tags",
        description:
          "The diagnostic engine highlights recurring feedback tags from examiners (e.g., 'Missing definition', 'One-sided analysis', 'No real-world data quoted').",
        proTip:
          "Focus your next three practice essays specifically on overcoming your top weakness tag.",
        badge: "Weaknesses",
      },
      {
        step: 3,
        title: "Follow Targeted Recommendations",
        description:
          "Click the personalized recommendations to open the exact definitions, diagram guides, or exemplar essays tailored to your weakest areas.",
        proTip:
          "Check your analytics weekly to verify that your scores are trending upward as exam day approaches.",
        badge: "Action Plan",
      },
    ],
  },
  {
    id: "classes",
    title: "Classrooms & Educator Workspace",
    navLabel: "Classes",
    routePrefix: "/classes",
    category: "Classroom & Diagnostics",
    paperTag: "Classroom & Cohorts",
    estimatedTime: "75 sec read",
    icon: UsersRound,
    summary:
      "Connect with your economics teacher or school department. Join classes with an enrollment code, complete assigned essays, receive teacher moderation feedback, and view cohort benchmarks.",
    whatItDoes: [
      "Students: Join school classes using a 6-character classroom code provided by your teacher",
      "View homework assignments, due dates, and specific past paper prompts set by your teacher",
      "Submit essays directly to your teacher's grading queue",
      "Teachers: Create classes, assign essays, view student score distributions, and add teacher commentary",
      "Cohort diagnostics: track class-wide strengths and syllabus gaps across Cambridge units",
    ],
    cambridgeExaminerInsight:
      "Submitting homework through your class workspace ensures both AI and your teacher can monitor your progress, giving you double the feedback on official Cambridge mark schemes.",
    directUrl: "/classes",
    steps: [
      {
        step: 1,
        title: "Join or Create a Classroom",
        description:
          "Students: Enter the 6-character code given by your teacher to join your economics class. Teachers: Click 'Create Classroom' to set up a new cohort (e.g., 'IGCSE Economics Period 3') and invite students.",
        proTip:
          "You can be enrolled in multiple classes simultaneously (e.g., school class and revision group).",
        badge: "Enrollment",
      },
      {
        step: 2,
        title: "Complete Assigned Homework Essays",
        description:
          "Check the 'Assignments' tab for tasks set by your teacher with deadlines and specific mark tariffs. Click 'Start Essay' to draft or upload your submission.",
        proTip:
          "Submit early so your teacher has time to review and add personalized moderation notes.",
        badge: "Assignments",
      },
      {
        step: 3,
        title: "Review Teacher Moderation & Class Stats",
        description:
          "View your teacher's feedback alongside the automated AI marks. Compare your performance against class averages to see where you stand in your cohort.",
        proTip: "Discuss your diagnostic scorecard with your teacher during review sessions.",
        badge: "Feedback",
      },
    ],
  },
  {
    id: "knowledge",
    title: "Syllabus Knowledge Base",
    navLabel: "Knowledge Base",
    routePrefix: "/knowledge",
    category: "Syllabus Resources",
    paperTag: "Cambridge IGCSE 0455 Theory",
    estimatedTime: "60 sec read",
    icon: BookOpen,
    summary:
      "Comprehensive Cambridge International 0455 revision guides, theoretical models, and syllabus topic notes for rapid revision and solidifying core economic principles.",
    whatItDoes: [
      "Structured syllabus notes matching the official Cambridge IGCSE 0455 syllabus specifications",
      "Covers all AS units (Basic Economic Ideas, Price System, Macro Economy, Government Intervention)",
      "Covers all IGCSE units (Theory of the Firm, Labor Markets, Economic Growth, Global Economy)",
      "Concise summary tables of policies, advantages, and limitations",
      "Integrated search to find specific models, formulas, and concepts quickly",
    ],
    cambridgeExaminerInsight:
      "Examiners award higher marks to candidates who demonstrate theoretical breadth — citing specific schools of thought (e.g. Classical vs Keynesian) when analyzing macroeconomic shocks.",
    directUrl: "/knowledge",
    steps: [
      {
        step: 1,
        title: "Browse by Cambridge Syllabus Chapter",
        description:
          "Navigate through syllabus units structured identically to the official CIE 0455 syllabus handbook.",
        proTip:
          "Review the topic summary before starting an essay on that topic to refresh key concepts.",
        badge: "Chapters",
      },
      {
        step: 2,
        title: "Study Policy Comparison Tables",
        description:
          "Review concise tables comparing fiscal policy, monetary policy, supply-side policy, and exchange rate policy with their respective transmission mechanisms and limitations.",
        proTip: "Memorize at least 2 distinct limitations for every major economic policy.",
        badge: "Comparison",
      },
      {
        step: 3,
        title: "Quick-Launch Definitions & Diagrams",
        description:
          "Click the inline links to jump directly to the relevant interactive diagram or definition card for that topic.",
        proTip: "Combine notes with diagram practice for maximum retention.",
        badge: "Interlinks",
      },
    ],
  },
  {
    id: "chat",
    title: "AI Economics Study Companion",
    navLabel: "AI Tutor Chat",
    routePrefix: "/chat",
    category: "Exam Practice",
    paperTag: "Interactive AI Tutor",
    estimatedTime: "60 sec read",
    icon: MessageSquare,
    summary:
      "An intelligent Cambridge Economics AI study companion and voice tutor. Ask questions about difficult concepts, get help planning essays, or debate economic policies in real time.",
    whatItDoes: [
      "Grounded Cambridge IGCSE 0455 knowledge engine answering questions on micro & macroeconomics",
      "Interactive essay planning: get thesis ideas, arguments for and against, and evaluation angles",
      "Voice mode: practice explaining economic concepts out loud for verbal reinforcement",
      "Real-world examples: ask for recent macroeconomic data and case studies to cite in essays",
      "Clarify doubts from past papers, textbook questions, or school homework",
    ],
    cambridgeExaminerInsight:
      "When asking the AI tutor for help, practice formulating questions using economic terms (e.g., 'What is the transmission mechanism of contractionary monetary policy on consumer expenditure?').",
    directUrl: "/chat",
    steps: [
      {
        step: 1,
        title: "Ask Any Cambridge Economics Question",
        description:
          "Type or speak your question into the chat box. Ask for explanations of complex concepts like comparative advantage, the Lorenz curve, or liquidity preference theory.",
        proTip:
          "Ask for 'A Cambridge IGCSE 0455 Level 5 explanation with a real-world example' for maximum exam relevance.",
        badge: "Questions",
      },
      {
        step: 2,
        title: "Brainstorm Essay Plans",
        description:
          "Paste an essay prompt and ask: 'Give me a 2-sided essay plan with 2 arguments for, 2 arguments against, and 3 evaluation points.'",
        proTip:
          "Use the generated plan as a scaffold, then draft the essay yourself in Grade Unlimited Essays.",
        badge: "Brainstorming",
      },
      {
        step: 3,
        title: "Request Real-World Economic Evidence",
        description:
          "Ask for contemporary examples of supply-side reforms, central bank quantitative tightening, or progressive taxation systems to cite in your essays.",
        proTip:
          "Examiners love specific country case studies (e.g., UK inflation 2022-2023, Singapore exchange rate policy).",
        badge: "Evidence",
      },
    ],
  },
  {
    id: "settings",
    title: "Settings & Academic Profile",
    navLabel: "Settings",
    routePrefix: "/settings",
    category: "Account",
    estimatedTime: "45 sec read",
    icon: Settings,
    summary:
      "Manage your Cambridge syllabus preferences, target grade, subscription pass, tutorial preferences, password, and profile details in one secure place.",
    whatItDoes: [
      "Set your target Cambridge qualification: IGCSE 0455, IGCSE Level, or Full IGCSE 0455",
      "Set your goal grade: A*, A, B, or C to calibrate personalized recommendations",
      "Manage subscription passes, plan limits, and invoicing",
      "Control feature tutorial preferences (re-enable or dismiss automatic walkthroughs)",
      "Update profile photo, display name, and school institution",
    ],
    cambridgeExaminerInsight:
      "Setting your target syllabus level ensures all question banks, essay generators, and MCQ simulators default to the exact papers you are taking.",
    directUrl: "/settings",
    steps: [
      {
        step: 1,
        title: "Set Syllabus Level & Target Grade",
        description:
          "Specify whether you are preparing for IGCSE 0455, IGCSE Level, or Full IGCSE 0455, and set your target grade (A*, A, B, C).",
        proTip:
          "Setting a target of A* configures the AI grader to hold your essays to the highest Cambridge standard.",
        badge: "Preferences",
      },
      {
        step: 2,
        title: "Manage Feature Tutorial Settings",
        description:
          "You can toggle whether new feature tutorials appear automatically when you visit pages, or reset all tutorials to view them again anytime.",
        proTip:
          "If you ever want a refresher on any tool, you can also click the Tutorial button in the top navigation bar at any time.",
        badge: "Tutorials",
      },
      {
        step: 3,
        title: "Manage Account & Preferences",
        description:
          "Check your remaining essay quota, active pass tier, and account security settings.",
        proTip:
          "Keep your school/college name updated so teachers can easily find you in class rosters.",
        badge: "Account",
      },
    ],
  },
];

/**
 * Helper to match current route pathname to the most relevant feature tutorial.
 */
export function matchTutorialByPath(pathname: string): FeatureTutorial | undefined {
  const cleanPath = pathname.split("?")[0].replace(/\/$/, "");

  // Specific matches first
  if (cleanPath.startsWith("/grade")) return FEATURE_TUTORIALS.find((t) => t.id === "grade");
  if (cleanPath.startsWith("/mcq")) return FEATURE_TUTORIALS.find((t) => t.id === "mcq-live");
  if (cleanPath.startsWith("/data-response"))
    return FEATURE_TUTORIALS.find((t) => t.id === "data-response");
  if (cleanPath.startsWith("/essay-generator"))
    return FEATURE_TUTORIALS.find((t) => t.id === "essay-generator");
  if (cleanPath.startsWith("/response-structure"))
    return FEATURE_TUTORIALS.find((t) => t.id === "response-structure");
  if (cleanPath.startsWith("/paper-matrix"))
    return FEATURE_TUTORIALS.find((t) => t.id === "paper-matrix");
  if (cleanPath.startsWith("/definitions"))
    return FEATURE_TUTORIALS.find((t) => t.id === "definitions");
  if (cleanPath.startsWith("/question-bank"))
    return FEATURE_TUTORIALS.find((t) => t.id === "question-bank");
  if (cleanPath.startsWith("/diagram")) return FEATURE_TUTORIALS.find((t) => t.id === "diagrams");
  if (cleanPath.startsWith("/command-words"))
    return FEATURE_TUTORIALS.find((t) => t.id === "command-words");
  if (cleanPath.startsWith("/showcase")) return FEATURE_TUTORIALS.find((t) => t.id === "showcase");
  if (cleanPath.startsWith("/review")) return FEATURE_TUTORIALS.find((t) => t.id === "review");
  if (cleanPath.startsWith("/classes")) return FEATURE_TUTORIALS.find((t) => t.id === "classes");
  if (cleanPath.startsWith("/knowledge"))
    return FEATURE_TUTORIALS.find((t) => t.id === "knowledge");
  if (cleanPath.startsWith("/chat")) return FEATURE_TUTORIALS.find((t) => t.id === "chat");
  if (cleanPath.startsWith("/settings")) return FEATURE_TUTORIALS.find((t) => t.id === "settings");
  if (cleanPath.startsWith("/dashboard"))
    return FEATURE_TUTORIALS.find((t) => t.id === "dashboard");

  return undefined;
}
