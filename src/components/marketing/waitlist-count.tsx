/**
 * The live "N already waiting" badge.
 *
 * Renders nothing at all until a real number arrives. A skeleton or a "0"
 * would either lie or draw attention to an empty list on day one; an absent
 * badge just looks like a badge that isn't there. Once the number exists it
 * counts up, using the same `CountUp` the rest of the page uses.
 */

import { useEffect, useState } from "react";
import { Users } from "lucide-react";

import { CountUp } from "@/components/marketing/reveal";
import { fetchWaitlistStats } from "@/lib/waitlist-client";
import { cn } from "@/lib/utils";

export function WaitlistCount({
  className,
  /** Below this, the badge stays hidden — an early list should not advertise. */
  threshold = 1,
}: {
  className?: string;
  threshold?: number;
}) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchWaitlistStats().then((stats) => {
      if (!cancelled && stats) setCount(stats.count);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (count === null || count < threshold) return null;

  return (
    <span className={cn("chip-soft pop-in", className)}>
      <Users className="size-3.5" aria-hidden="true" />
      <CountUp value={count} /> already waiting
    </span>
  );
}
