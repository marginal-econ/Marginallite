import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/app-shell";
import { DataResponseStudio } from "@/components/app/data-response-admin";

export const Route = createFileRoute("/_authenticated/data-response")({
  head: () => ({
    meta: [
      {
        title: "Cambridge Data Response Studio (0455 Section A) — Marginalite Economics",
      },
      {
        name: "description",
        content:
          "Practice authentic Cambridge IGCSE Economics (0455) Section A Data Response papers with real case studies, Table 1.1 data, interactive diagrams, and strict mark scheme grading.",
      },
      {
        property: "og:title",
        content: "Cambridge Data Response Studio — Marginalite Economics",
      },
      {
        property: "og:description",
        content:
          "Master Cambridge IGCSE 0455 Paper 2 Section A data response with authentic past-paper case studies, interactive tables, diagrams, and instant official mark-scheme grading.",
      },
    ],
  }),
  component: DataResponsePage,
});

function DataResponsePage() {
  return (
    <div className="w-full max-w-[1600px] mx-auto p-3 sm:p-5 md:p-6 space-y-5">
      <PageHeader
        title="Data Response Papers"
        description="Master Cambridge IGCSE 0455 Paper 2 Section A case studies, interpret Table 1.1 figures, draw demand/supply & PPC diagrams, and get marked strictly against official Cambridge mark schemes."
      />
      <DataResponseStudio />
    </div>
  );
}
