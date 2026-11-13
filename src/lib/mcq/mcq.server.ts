/**
 * MCQ shared types and constants — Cambridge IGCSE Economics (0455) Paper 1
 * multiple choice questions. AI question generation has been removed as a product
 * decision: every question in the app comes from a real past paper. This file keeps
 * the shapes and syllabus reference lists that the past-paper flow, marking,
 * and history depend on.
 */
import type { Era } from "../igcse/paper-config";
import { MCQ_PAPER_CONFIG } from "../igcse/paper-config";

export type McqOption = "A" | "B" | "C" | "D";

export type McqQuestion = {
  number: number;
  stem: string;
  options: Record<McqOption, string>;
  answer: McqOption;
  explanation: string;
  distractorNotes: Partial<Record<McqOption, string>>;
  topic: string;
  syllabusRef: string | null;
  skill: "knowledge" | "application" | "analysis";
  diagramId?: string | null;
  diagramImageUrl?: string | null;
};

/**
 * Paper 1 durations:
 * - Legacy (through June 2026): 30 questions, 45 minutes (2700s)
 * - 2027-2029 syllabus: 40 questions, 1 hour (3600s)
 */
export const PAPER_DURATION_SECONDS: Record<Era, number> = {
  legacy: MCQ_PAPER_CONFIG.legacy.durationSeconds,
  "2027": MCQ_PAPER_CONFIG["2027"].durationSeconds,
};

/** Official Cambridge IGCSE Economics (0455) Syllabus Units 1 to 6 */
export const IGCSE_0455_SECTIONS = [
  "Unit 1: The basic economic problem (scarcity, factors of production, opportunity cost, PPCs)",
  "Unit 2: The allocation of resources (demand, supply, equilibrium, elasticities, price mechanism, market failure)",
  "Unit 3: Microeconomic decision makers (money and banking, households, workers, trade unions, firms, costs, revenues, market structure)",
  "Unit 4: Government and the macroeconomy (macroeconomic aims, fiscal, monetary, and supply-side policies, inflation, unemployment, growth)",
  "Unit 5: Economic development (living standards, poverty, population, development differences)",
  "Unit 6: International trade and global economy (international specialisation, trade protection, exchange rates, balance of payments)",
];

export const IGCSE_SECTIONS = IGCSE_0455_SECTIONS;
