import React, { useMemo, useState } from "react";
import type { DiagramMetrics, DiagramState, ShadedPolygon } from "@/lib/diagram-lab/types";
import { getShadedPolygons } from "@/lib/diagram-lab/math";
import { cn } from "@/lib/utils";

interface CanvasProps {
  state: DiagramState;
  metrics: DiagramMetrics;
  className?: string;
}

export function InteractiveDiagramCanvas({ state, metrics, className }: CanvasProps) {
  const [hoveredPolygon, setHoveredPolygon] = useState<ShadedPolygon | null>(null);

  // SVG dimensions & coordinate scale
  // Coordinate range: Q from 0 to 100, P from 0 to 100
  // SVG viewport: 540 x 420
  const margin = { top: 30, right: 40, bottom: 50, left: 60 };
  const width = 540;
  const height = 420;
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;

  // Convert (Q, P) -> (SVG X, SVG Y)
  const toSvgX = (q: number) => margin.left + (Math.max(0, Math.min(100, q)) / 100) * plotWidth;
  const toSvgY = (p: number) => margin.top + plotHeight - (Math.max(0, Math.min(100, p)) / 100) * plotHeight;

  const polygons = useMemo(() => getShadedPolygons(state, metrics), [state, metrics]);

  // Curve endpoints
  const effDemandIntercept = state.demandIntercept + state.demandShift;
  const effSupplyIntercept = state.supplyIntercept + state.supplyShift;

  // Demand D1: from Q=0 (P=effDemandIntercept) to P=0 (Q=effDemandIntercept/slope)
  const d1Points = {
    x1: toSvgX(0),
    y1: toSvgY(effDemandIntercept),
    x2: toSvgX(Math.min(95, effDemandIntercept / state.demandSlope)),
    y2: toSvgY(Math.max(5, effDemandIntercept - state.demandSlope * 95)),
  };

  // Supply S1: from Q=0 (P=effSupplyIntercept) to Q=95
  const s1Points = {
    x1: toSvgX(0),
    y1: toSvgY(effSupplyIntercept),
    x2: toSvgX(95),
    y2: toSvgY(Math.min(95, effSupplyIntercept + state.supplySlope * 95)),
  };

  // Taxed Supply (S2 = S1 + Tax) if tax > 0
  const hasTax = state.preset === "tax" && state.taxAmount > 0;
  const s2Points = hasTax
    ? {
        x1: toSvgX(0),
        y1: toSvgY(effSupplyIntercept + state.taxAmount),
        x2: toSvgX(95),
        y2: toSvgY(Math.min(95, effSupplyIntercept + state.taxAmount + state.supplySlope * 95)),
      }
    : null;

  // Externality MSC = MPC + MEC
  const hasMEC = state.preset === "externality" && state.externalityCost > 0;
  const mscPoints = hasMEC
    ? {
        x1: toSvgX(0),
        y1: toSvgY(effSupplyIntercept + state.externalityCost),
        x2: toSvgX(95),
        y2: toSvgY(
          Math.min(95, effSupplyIntercept + state.externalityCost + state.supplySlope * 95),
        ),
      }
    : null;

  return (
    <div className={cn("relative flex flex-col items-center select-none", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto max-h-[460px] drop-shadow-sm font-sans"
        aria-label="Interactive Cambridge Economics Diagram"
      >
        <defs>
          <marker
            id="arrowhead-p"
            markerWidth="7"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 7 3.5, 0 7" className="fill-foreground/70" />
          </marker>
          <marker
            id="arrowhead-q"
            markerWidth="7"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 7 3.5, 0 7" className="fill-foreground/70" />
          </marker>
          <pattern id="grid" width="44" height="34" patternUnits="userSpaceOnUse">
            <path
              d="M 44 0 L 0 0 0 34"
              fill="none"
              stroke="currentColor"
              className="text-muted-foreground/[0.07]"
              strokeWidth="0.8"
            />
          </pattern>
        </defs>

        {/* Background grid */}
        <rect
          x={margin.left}
          y={margin.top}
          width={plotWidth}
          height={plotHeight}
          fill="url(#grid)"
        />

        {/* Shaded Area Polygons (CS, PS, Tax Revenue, DWL) */}
        {polygons.map((poly) => {
          const pathD =
            poly.points
              .map((pt, idx) => `${idx === 0 ? "M" : "L"} ${toSvgX(pt.q)} ${toSvgY(pt.p)}`)
              .join(" ") + " Z";

          const isHovered = hoveredPolygon?.id === poly.id;

          return (
            <path
              key={poly.id}
              d={pathD}
              className={cn(
                poly.fillClass,
                poly.strokeClass,
                "transition-opacity cursor-pointer stroke-[1.2]",
                isHovered ? "opacity-95 stroke-[2]" : "opacity-80 hover:opacity-95",
              )}
              onMouseEnter={() => setHoveredPolygon(poly)}
              onMouseLeave={() => setHoveredPolygon(null)}
            />
          );
        })}

        {/* Axes */}
        {/* Y Axis: Price */}
        <line
          x1={margin.left}
          y1={margin.top + plotHeight}
          x2={margin.left}
          y2={margin.top - 12}
          stroke="currentColor"
          strokeWidth="2"
          markerEnd="url(#arrowhead-p)"
          className="text-foreground/80"
        />
        <text
          x={margin.left - 12}
          y={margin.top - 14}
          textAnchor="end"
          className="text-[13px] font-bold fill-foreground"
        >
          Price (P)
        </text>

        {/* X Axis: Quantity */}
        <line
          x1={margin.left}
          y1={margin.top + plotHeight}
          x2={margin.left + plotWidth + 20}
          y2={margin.top + plotHeight}
          stroke="currentColor"
          strokeWidth="2"
          markerEnd="url(#arrowhead-q)"
          className="text-foreground/80"
        />
        <text
          x={margin.left + plotWidth + 24}
          y={margin.top + plotHeight + 4}
          textAnchor="start"
          className="text-[13px] font-bold fill-foreground"
        >
          Quantity (Q)
        </text>

        {/* Origin 0 */}
        <text
          x={margin.left - 8}
          y={margin.top + plotHeight + 16}
          textAnchor="end"
          className="text-[11px] font-medium fill-muted-foreground"
        >
          0
        </text>

        {/* CURVES */}

        {/* Demand Curve D1 */}
        <line
          x1={d1Points.x1}
          y1={d1Points.y1}
          x2={d1Points.x2}
          y2={d1Points.y2}
          stroke="#2563eb"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <text
          x={d1Points.x2 + 4}
          y={d1Points.y2 + 4}
          className="text-[12px] font-bold fill-blue-600 dark:fill-blue-400"
        >
          {state.preset === "externality" ? "MPB = MSB" : "D"}
        </text>

        {/* Supply Curve S1 */}
        <line
          x1={s1Points.x1}
          y1={s1Points.y1}
          x2={s1Points.x2}
          y2={s1Points.y2}
          stroke="#ea580c"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <text
          x={s1Points.x2 + 4}
          y={s1Points.y2}
          className="text-[12px] font-bold fill-orange-600 dark:fill-orange-400"
        >
          {state.preset === "externality" ? "MPC" : hasTax ? "S₁" : "S"}
        </text>

        {/* S2 curve (after tax) */}
        {s2Points && (
          <>
            <line
              x1={s2Points.x1}
              y1={s2Points.y1}
              x2={s2Points.x2}
              y2={s2Points.y2}
              stroke="#8b7cf6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="5 3"
            />
            <text
              x={s2Points.x2 + 4}
              y={s2Points.y2}
              className="text-[12px] font-bold fill-violet-600 dark:fill-violet-400"
            >
              S₂ (S + Tax)
            </text>
          </>
        )}

        {/* MSC curve (externality) */}
        {mscPoints && (
          <>
            <line
              x1={mscPoints.x1}
              y1={mscPoints.y1}
              x2={mscPoints.x2}
              y2={mscPoints.y2}
              stroke="#e11d48"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <text
              x={mscPoints.x2 + 4}
              y={mscPoints.y2}
              className="text-[12px] font-bold fill-rose-600 dark:fill-rose-400"
            >
              MSC (MPC + MEC)
            </text>
          </>
        )}

        {/* Price Floor / Ceiling horizontal dashed line */}
        {state.priceControl !== null && (
          <>
            <line
              x1={margin.left}
              y1={toSvgY(state.priceControl)}
              x2={margin.left + plotWidth}
              y2={toSvgY(state.priceControl)}
              stroke="#059669"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <text
              x={margin.left + plotWidth + 6}
              y={toSvgY(state.priceControl) + 4}
              className="text-[11px] font-bold fill-emerald-600 dark:fill-emerald-400"
            >
              {state.preset === "price_floor" ? "P_min (Floor)" : "P_max (Ceiling)"}
            </text>
            <text
              x={margin.left - 6}
              y={toSvgY(state.priceControl) + 4}
              textAnchor="end"
              className="text-[11px] font-bold fill-emerald-600 dark:fill-emerald-400"
            >
              {state.preset === "price_floor" ? "P_min" : "P_max"}
            </text>
          </>
        )}

        {/* World Price & Tariff for Tariff preset */}
        {state.preset === "tariff" && (
          <>
            {/* World price Pw */}
            <line
              x1={margin.left}
              y1={toSvgY(state.worldPrice)}
              x2={margin.left + plotWidth}
              y2={toSvgY(state.worldPrice)}
              stroke="#2563eb"
              strokeWidth="1.8"
              strokeDasharray="3 3"
            />
            <text
              x={margin.left - 6}
              y={toSvgY(state.worldPrice) + 4}
              textAnchor="end"
              className="text-[11px] font-bold fill-blue-600 dark:fill-blue-400"
            >
              P_w
            </text>
            <text
              x={margin.left + plotWidth + 4}
              y={toSvgY(state.worldPrice) + 4}
              className="text-[11px] font-bold fill-blue-600 dark:fill-blue-400"
            >
              S_world (Pw)
            </text>

            {/* Tariff price Pw + Tariff */}
            {state.tariffAmount > 0 && (
              <>
                <line
                  x1={margin.left}
                  y1={toSvgY(state.worldPrice + state.tariffAmount)}
                  x2={margin.left + plotWidth}
                  y2={toSvgY(state.worldPrice + state.tariffAmount)}
                  stroke="#7c6df0"
                  strokeWidth="2"
                />
                <text
                  x={margin.left - 6}
                  y={toSvgY(state.worldPrice + state.tariffAmount) + 4}
                  textAnchor="end"
                  className="text-[11px] font-bold fill-violet-600 dark:fill-violet-400"
                >
                  P_w+t
                </text>
                <text
                  x={margin.left + plotWidth + 4}
                  y={toSvgY(state.worldPrice + state.tariffAmount) + 4}
                  className="text-[11px] font-bold fill-violet-600 dark:fill-violet-400"
                >
                  S_world+tariff
                </text>
              </>
            )}
          </>
        )}

        {/* EQUILIBRIUM DASHED PROJECTION LINES */}

        {/* Initial Equilibrium E1 (Q0, P0) */}
        <line
          x1={toSvgX(metrics.initialQ)}
          y1={toSvgY(metrics.initialP)}
          x2={toSvgX(metrics.initialQ)}
          y2={margin.top + plotHeight}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="3 3"
          className="text-muted-foreground/60"
        />
        <line
          x1={margin.left}
          y1={toSvgY(metrics.initialP)}
          x2={toSvgX(metrics.initialQ)}
          y2={toSvgY(metrics.initialP)}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="3 3"
          className="text-muted-foreground/60"
        />
        <circle
          cx={toSvgX(metrics.initialQ)}
          cy={toSvgY(metrics.initialP)}
          r="4.5"
          className="fill-orange-500 stroke-background stroke-2"
        />
        <text
          x={toSvgX(metrics.initialQ) + 6}
          y={toSvgY(metrics.initialP) - 6}
          className="text-[11px] font-bold fill-foreground"
        >
          {hasTax ? "E₁" : "E*"}
        </text>
        <text
          x={toSvgX(metrics.initialQ)}
          y={margin.top + plotHeight + 16}
          textAnchor="middle"
          className="text-[11px] font-semibold fill-muted-foreground"
        >
          {hasTax ? "Q₁" : "Q*"}
        </text>
        <text
          x={margin.left - 6}
          y={toSvgY(metrics.initialP) + 4}
          textAnchor="end"
          className="text-[11px] font-semibold fill-muted-foreground"
        >
          {hasTax ? "P₁" : "P*"}
        </text>

        {/* Tax Equilibrium E2 (Q2, P2) if tax > 0 */}
        {hasTax && (
          <>
            <line
              x1={toSvgX(metrics.eqQ)}
              y1={toSvgY(metrics.eqP)}
              x2={toSvgX(metrics.eqQ)}
              y2={margin.top + plotHeight}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="3 3"
              className="text-muted-foreground/60"
            />
            <line
              x1={margin.left}
              y1={toSvgY(metrics.eqP)}
              x2={toSvgX(metrics.eqQ)}
              y2={toSvgY(metrics.eqP)}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="3 3"
              className="text-muted-foreground/60"
            />
            {/* Producer price line P_p */}
            <line
              x1={margin.left}
              y1={toSvgY(metrics.eqP - state.taxAmount)}
              x2={toSvgX(metrics.eqQ)}
              y2={toSvgY(metrics.eqP - state.taxAmount)}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="2 2"
              className="text-muted-foreground/50"
            />
            <text
              x={margin.left - 6}
              y={toSvgY(metrics.eqP - state.taxAmount) + 4}
              textAnchor="end"
              className="text-[11px] font-semibold fill-violet-600 dark:fill-violet-400"
            >
              P_p
            </text>

            <circle
              cx={toSvgX(metrics.eqQ)}
              cy={toSvgY(metrics.eqP)}
              r="4.5"
              className="fill-violet-600 stroke-background stroke-2"
            />
            <text
              x={toSvgX(metrics.eqQ) - 18}
              y={toSvgY(metrics.eqP) - 6}
              className="text-[11px] font-bold fill-violet-600 dark:fill-violet-400"
            >
              E₂
            </text>
            <text
              x={toSvgX(metrics.eqQ)}
              y={margin.top + plotHeight + 16}
              textAnchor="middle"
              className="text-[11px] font-semibold fill-violet-600 dark:fill-violet-400"
            >
              Q₂
            </text>
            <text
              x={margin.left - 6}
              y={toSvgY(metrics.eqP) + 4}
              textAnchor="end"
              className="text-[11px] font-semibold fill-violet-600 dark:fill-violet-400"
            >
              P₂ (P_c)
            </text>
          </>
        )}
      </svg>

      {/* Hover tooltip for shaded polygon */}
      {hoveredPolygon && (
        <div className="absolute top-4 right-4 max-w-xs rounded-lg border border-border/80 bg-background/95 p-2.5 shadow-md backdrop-blur-sm text-xs pointer-events-none transition-all">
          <p className="font-semibold text-foreground flex items-center justify-between gap-2">
            <span>{hoveredPolygon.label}</span>
            <span className="font-mono text-primary font-bold">
              {hoveredPolygon.areaValue.toFixed(1)} units²
            </span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">{hoveredPolygon.description}</p>
        </div>
      )}
    </div>
  );
}
