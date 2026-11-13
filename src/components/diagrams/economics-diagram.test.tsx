import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DIAGRAMS } from "@/lib/diagrams/catalog";

import { EconomicsDiagram } from "./economics-diagram";

describe("EconomicsDiagram labels", () => {
  it("protects every annotation from overlapping graph lines", () => {
    for (const entry of DIAGRAMS) {
      const markup = renderToStaticMarkup(
        <EconomicsDiagram spec={entry.spec} title={entry.title} />,
      );
      const labels = markup.match(/<text\b[^>]*>/g) ?? [];

      expect(labels.length, entry.id).toBeGreaterThan(1);
      for (const label of labels) {
        expect(label, `${entry.id}: ${label}`).toContain('paint-order="stroke"');
        expect(label, `${entry.id}: ${label}`).toContain('stroke="var(--card)"');
      }
    }
  });

  it("pulls long right-edge curve labels back inside the plot", () => {
    for (const entry of DIAGRAMS) {
      const markup = renderToStaticMarkup(
        <EconomicsDiagram spec={entry.spec} title={entry.title} />,
      );

      for (const curve of entry.spec.curves) {
        if (!curve.label || !curve.labelAt) continue;
        if (curve.labelAt[0] < 84 || curve.label.length <= 4) continue;

        const escaped = curve.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        expect(markup, `${entry.id}: ${curve.label}`).toMatch(
          new RegExp(`<text[^>]*text-anchor="end"[^>]*>${escaped}</text>`),
        );
      }
    }
  });

  it("renders every shaded-area label above graph lines with a clearing capsule", () => {
    for (const entry of DIAGRAMS) {
      const markup = renderToStaticMarkup(
        <EconomicsDiagram spec={entry.spec} title={entry.title} />,
      );

      for (const shade of entry.spec.shades ?? []) {
        if (!shade.label) continue;
        const escaped = shade.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        expect(markup, `${entry.id}: ${shade.label}`).toMatch(
          new RegExp(
            `<g[^>]*data-diagram-area-label="${escaped}"[^>]*><rect[^>]*fill="var\\(--card\\)"[^>]*>`,
          ),
        );
      }
    }
  });
});
