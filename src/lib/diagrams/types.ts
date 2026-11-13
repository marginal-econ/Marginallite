import type { DiagramLabel, DiagramSpec } from "./spec";

export type DiagramSection = "Microeconomics" | "Macroeconomics";

export type DiagramLevel = "Core" | "Extended" | "Core & Extended";

export type DiagramEntry = {
  id: string;
  title: string;
  section: DiagramSection;
  topic: string;
  level: DiagramLevel;
  spec: DiagramSpec;
  /** What the diagram represents. */
  represents: string;
  /** Why Cambridge uses it. */
  whyUsed: string;
  /** When candidates are expected to draw it. */
  whenToDraw: string;
  /** How to interpret it, step by step. */
  howToRead: string[];
  labels: DiagramLabel[];
  mistakes: string[];
  tips: string[];
  realWorld: string[];
  related: string[];
  examQuestions: string[];
};
