import type { SentenceSpan } from "@/lib/live-examiner/types";
import { cn } from "@/lib/utils";

export type AoRailProps = {
  sentences: SentenceSpan[];
  className?: string;
};

export function AoRail({ sentences, className }: AoRailProps) {
  if (sentences.length === 0) return null;

  // Group sentences by paragraphIndex
  const paragraphMap = new Map<number, SentenceSpan[]>();
  for (const s of sentences) {
    const list = paragraphMap.get(s.paragraphIndex) || [];
    list.push(s);
    paragraphMap.set(s.paragraphIndex, list);
  }

  const paragraphEntries = Array.from(paragraphMap.entries()).sort(
    ([a], [b]) => a - b,
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-full bg-muted/40 p-1.5 backdrop-blur-xs",
        className,
      )}
      title="Essay AO shape minimap"
    >
      {paragraphEntries.map(([pIndex, pSentences]) => {
        // Determine dominant AO for paragraph
        let ao1 = 0;
        let ao2 = 0;
        let ao3 = 0;
        for (const s of pSentences) {
          if (s.ao?.tag === "ao1") ao1++;
          else if (s.ao?.tag === "ao2") ao2++;
          else if (s.ao?.tag === "ao3") ao3++;
        }

        let toneClass = "bg-muted-foreground/30";
        if (ao3 > 0) toneClass = "bg-[var(--ao3)]";
        else if (ao2 >= ao1 && ao2 > 0) toneClass = "bg-[var(--ao2)]";
        else if (ao1 > 0) toneClass = "bg-[var(--ao1)]";

        return (
          <div
            key={pIndex}
            className={cn(
              "size-2.5 rounded-full transition-transform hover:scale-125 cursor-pointer",
              toneClass,
            )}
            title={`Paragraph ${pIndex + 1}: ${ao1} AO1, ${ao2} AO2, ${ao3} AO3`}
          />
        );
      })}
    </div>
  );
}
