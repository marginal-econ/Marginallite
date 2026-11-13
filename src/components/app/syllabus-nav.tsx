import { Link, useRouterState } from "@tanstack/react-router";
import { BookMarked, BookText, CircleHelp, LineChart, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export const SYLLABUS_TABS = [
  { to: "/definitions", label: "Definitions Hub", icon: BookText },
  { to: "/diagrams", label: "Diagram Library", icon: LineChart },
  { to: "/command-words", label: "Command Words", icon: CircleHelp },
  { to: "/question-bank", label: "Question Bank", icon: BookMarked },
  { to: "/showcase", label: "Exemplars Showcase", icon: Trophy },
] as const;

export function SyllabusNavTabs() {
  return null;
}
