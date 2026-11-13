import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Copy,
  HelpCircle,
  Layers,
  LineChart,
  Lock,
  RotateCcw,
  Sliders,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/app-shell";
import { InteractiveDiagramCanvas } from "@/components/diagram-lab/interactive-diagram-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMe } from "@/lib/account.functions";
import {
  CAMBRIDGE_DIAGRAM_DRILLS,
  calculateMetrics,
  DEFAULT_DIAGRAM_STATES,
} from "@/lib/diagram-lab/math";
import type { DiagramPreset, DiagramState } from "@/lib/diagram-lab/types";

export const Route = createFileRoute("/_authenticated/diagram-lab")({
  head: () => ({
    meta: [
      { title: "Interactive Diagram CAD & Geometry Lab — Cambridge 0455" },
      {
        name: "description",
        content:
          "Interactive vector economics canvas for Cambridge 0455. Dynamically manipulate curves, test elasticity, and calculate consumer surplus, deadweight loss, and tax incidence with zero AI cost.",
      },
    ],
  }),
  component: DiagramLabPage,
});

function DiagramLabPage() {
  const navigate = useNavigate();
  const getMeFn = useServerFn(getMe);
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => getMeFn(),
    staleTime: 30_000,
  });

  const isAdmin = meQuery.data?.isAdmin ?? false;

  const [activeTab, setActiveTab] = useState<"sandbox" | "drills">("sandbox");
  const [preset, setPreset] = useState<DiagramPreset>("tax");
  const [state, setState] = useState<DiagramState>(DEFAULT_DIAGRAM_STATES.tax);

  // Drill mode state
  const [activeDrillIndex, setActiveDrillIndex] = useState(0);
  const activeDrill = CAMBRIDGE_DIAGRAM_DRILLS[activeDrillIndex]!;
  const [drillEvaluated, setDrillEvaluated] = useState(false);

  const metrics = useMemo(() => calculateMetrics(state), [state]);

  // Drill check
  const drillResult = useMemo(
    () => activeDrill.targetCheck(state, metrics),
    [activeDrill, state, metrics],
  );

  // Experimental Labs are strictly confidential to platform administrators
  if (!meQuery.isLoading && !isAdmin) {
    navigate({ to: "/dashboard", replace: true });
    return null;
  }

  // Switch preset
  const handlePresetChange = (newPreset: DiagramPreset) => {
    setPreset(newPreset);
    setState(DEFAULT_DIAGRAM_STATES[newPreset]);
    setDrillEvaluated(false);
  };

  const resetCurrent = () => {
    setState(DEFAULT_DIAGRAM_STATES[state.preset]);
    setDrillEvaluated(false);
    toast.info("Diagram reset to default Cambridge calibration.");
  };

  const copyDiagramTag = () => {
    const title =
      state.preset === "tax"
        ? "Specific Indirect Tax on Inelastic Good"
        : state.preset === "tariff"
          ? "Tariff on Imported Manufactured Goods"
          : state.preset === "price_floor"
            ? "Minimum Price (Price Floor) above Equilibrium"
            : state.preset === "externality"
              ? "Negative Production Externality with MSC > MPC"
              : "Market Demand and Supply Equilibrium";

    const tag = `[DIAGRAM: ${title} | axes: Price (P) / Quantity (Q) | curves: D, S, S+tax | equilibrium: P* = ${metrics.eqP.toFixed(1)}, Q* = ${metrics.eqQ.toFixed(1)} | deadweight_loss: ${metrics.deadweightLoss.toFixed(1)} | accuracy: dynamically plotted using Cambridge Diagram CAD Engine]`;

    navigator.clipboard.writeText(tag);
    toast.success("Copied Cambridge Diagram Tag! You can paste this straight into your essay.");
  };

  return (
    <>
      <PageHeader
        title="Diagram CAD & Geometry Lab"
        description="Interactive vector economics sandbox for Cambridge IGCSE 0455. Adjust curve slopes, simulate taxes & tariffs, and evaluate consumer surplus and deadweight loss with mathematical precision."
        action={
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            100% Deterministic · Zero AI Cost
          </Badge>
        }
      />

      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
        {/* Top Control Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-4">
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              const tab = val as "sandbox" | "drills";
              setActiveTab(tab);
              if (tab === "drills") {
                const targetPreset = activeDrill.preset;
                setPreset(targetPreset);
                setState(DEFAULT_DIAGRAM_STATES[targetPreset]);
              }
            }}
          >
            <TabsList className="grid grid-cols-2 w-72">
              <TabsTrigger value="sandbox" className="flex items-center gap-1.5 text-xs">
                <Sliders className="size-3.5" /> Freeform Sandbox
              </TabsTrigger>
              <TabsTrigger value="drills" className="flex items-center gap-1.5 text-xs">
                <Award className="size-3.5 text-amber-500" /> Cambridge Drills
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={resetCurrent} className="text-xs">
              <RotateCcw className="size-3.5 mr-1" /> Reset
            </Button>
            <Button variant="secondary" size="sm" onClick={copyDiagramTag} className="text-xs">
              <Copy className="size-3.5 mr-1" /> Copy [DIAGRAM: ...] Tag
            </Button>
          </div>
        </div>

        {/* DRILL HEADER (If in drill mode) */}
        {activeTab === "drills" && (
          <Card className="border-amber-500/30 bg-amber-500/5 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                    Drill {activeDrillIndex + 1} of {CAMBRIDGE_DIAGRAM_DRILLS.length}
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">{activeDrill.paperReference}</span>
                </div>
                <div className="flex items-center gap-1">
                  {CAMBRIDGE_DIAGRAM_DRILLS.map((d, idx) => (
                    <button
                      key={d.id}
                      onClick={() => {
                        setActiveDrillIndex(idx);
                        setPreset(d.preset);
                        setState(DEFAULT_DIAGRAM_STATES[d.preset]);
                        setDrillEvaluated(false);
                      }}
                      className={`size-7 rounded-md text-xs font-semibold transition-all ${
                        activeDrillIndex === idx
                          ? "bg-amber-600 text-white shadow-xs"
                          : "bg-muted/80 text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
              <CardTitle className="text-base font-bold text-foreground mt-1">{activeDrill.title}</CardTitle>
              <CardDescription className="text-xs text-foreground/80 leading-relaxed">
                {activeDrill.prompt}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/70 bg-background/80">
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold text-muted-foreground">Diagnostic Result: </span>
                  {drillEvaluated ? (
                    drillResult.passed ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" /> Full Cambridge Marks (3/3)
                      </span>
                    ) : (
                      <span className="font-bold text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                        <XCircle className="size-3.5" /> Partial ({drillResult.score}/3)
                      </span>
                    )
                  ) : (
                    <span className="text-muted-foreground">Adjust curves on canvas and click Evaluate</span>
                  )}
                  {drillEvaluated && (
                    <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                      {drillResult.feedback}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => setDrillEvaluated(true)}
                  className="shrink-0 text-xs font-semibold"
                >
                  Evaluate Drill
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* MAIN WORKSPACE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: CANVAS VIEW */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="border-border shadow-xs overflow-hidden">
              <CardHeader className="py-3 px-4 border-b border-border/60 flex flex-row items-center justify-between bg-muted/20">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <LineChart className="size-4 text-primary" />
                    Cambridge Vector Coordinate Plane
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    Hover over any shaded area or curve to inspect economic significance.
                  </CardDescription>
                </div>
                {activeTab === "sandbox" && (
                  <Select value={preset} onValueChange={(v) => handlePresetChange(v as DiagramPreset)}>
                    <SelectTrigger className="w-44 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tax">Indirect Specific Tax</SelectItem>
                      <SelectItem value="price_floor">Minimum Price (Floor)</SelectItem>
                      <SelectItem value="price_ceiling">Maximum Price (Ceiling)</SelectItem>
                      <SelectItem value="tariff">Import Tariff</SelectItem>
                      <SelectItem value="externality">Negative Externality</SelectItem>
                      <SelectItem value="macro_ad_as">Macro AD / SRAS</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </CardHeader>
              <CardContent className="p-4 bg-card flex justify-center">
                <InteractiveDiagramCanvas state={state} metrics={metrics} className="w-full" />
              </CardContent>
            </Card>

            {/* LIVE SURPLUS & WELFARE TABLE */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">Equilibrium Price</span>
                <p className="text-base font-bold font-mono text-foreground">
                  P* = {metrics.eqP.toFixed(1)}
                </p>
                <span className="text-[10px] text-muted-foreground block">
                  Initial P₀ = {metrics.initialP.toFixed(1)}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">Equilibrium Quantity</span>
                <p className="text-base font-bold font-mono text-foreground">
                  Q* = {metrics.eqQ.toFixed(1)}
                </p>
                <span className="text-[10px] text-muted-foreground block">
                  Initial Q₀ = {metrics.initialQ.toFixed(1)}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">Consumer Surplus</span>
                <p className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {metrics.consumerSurplus.toFixed(0)} units²
                </p>
                <span className="text-[10px] text-muted-foreground block">Area below D, above P</span>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium">Deadweight Loss</span>
                <p className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">
                  {metrics.deadweightLoss.toFixed(1)} units²
                </p>
                <span className="text-[10px] text-muted-foreground block">Welfare triangle</span>
              </div>
            </div>
          </div>

          {/* RIGHT: INTERACTIVE SLIDERS & PARAMETER CONTROLS */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-border shadow-xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sliders className="size-4 text-primary" />
                  Curve Parameters &amp; Elasticity Sliders
                </CardTitle>
                <CardDescription className="text-xs">
                  Manipulate slopes to simulate elastic vs inelastic goods, or apply government policy wedges.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4.5 p-4 text-xs">
                {/* Demand Slope / Elasticity */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center font-medium">
                    <Label className="text-xs">Demand Elasticity Slope ({state.demandSlope.toFixed(2)})</Label>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {state.demandSlope >= 1.0 ? "Relatively Inelastic" : "Relatively Elastic"}
                    </span>
                  </div>
                  <Slider
                    value={[state.demandSlope]}
                    min={0.3}
                    max={1.5}
                    step={0.05}
                    onValueChange={([val]) => setState((s) => ({ ...s, demandSlope: val ?? 0.8 }))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Steeper slope = lower Price Elasticity of Demand (PED). Flatter slope = higher PED.
                  </p>
                </div>

                {/* Supply Slope / Elasticity */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center font-medium">
                    <Label className="text-xs">Supply Elasticity Slope ({state.supplySlope.toFixed(2)})</Label>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {state.supplySlope >= 1.0 ? "Relatively Inelastic" : "Relatively Elastic"}
                    </span>
                  </div>
                  <Slider
                    value={[state.supplySlope]}
                    min={0.3}
                    max={1.5}
                    step={0.05}
                    onValueChange={([val]) => setState((s) => ({ ...s, supplySlope: val ?? 0.8 }))}
                  />
                </div>

                {/* Demand Shift */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center font-medium">
                    <Label className="text-xs">Demand Shift ΔD ({state.demandShift >= 0 ? `+${state.demandShift}` : state.demandShift})</Label>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {state.demandShift > 0 ? "Outward (Right)" : state.demandShift < 0 ? "Inward (Left)" : "Zero Shift"}
                    </span>
                  </div>
                  <Slider
                    value={[state.demandShift]}
                    min={-25}
                    max={25}
                    step={1}
                    onValueChange={([val]) => setState((s) => ({ ...s, demandShift: val ?? 0 }))}
                  />
                </div>

                {/* Policy Specific Controls depending on preset */}
                {state.preset === "tax" && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <div className="flex justify-between items-center font-medium">
                      <Label className="text-xs text-primary font-bold">
                        Specific Indirect Tax per unit: £{state.taxAmount}
                      </Label>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        Yield: £{metrics.taxRevenue.toFixed(0)}
                      </span>
                    </div>
                    <Slider
                      value={[state.taxAmount]}
                      min={0}
                      max={35}
                      step={1}
                      onValueChange={([val]) => setState((s) => ({ ...s, taxAmount: val ?? 0 }))}
                    />
                    {state.taxAmount > 0 && (
                      <div className="rounded-md bg-muted/40 p-2.5 space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span>Consumer Tax Burden:</span>
                          <span className="font-semibold text-foreground">{metrics.consumerTaxBurdenPct.toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span>Producer Tax Burden:</span>
                          <span className="font-semibold text-foreground">{metrics.producerTaxBurdenPct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-amber-500/30 rounded-full overflow-hidden flex">
                          <div
                            className="bg-primary h-full"
                            style={{ width: `${metrics.consumerTaxBurdenPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {state.preset === "price_floor" && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <div className="flex justify-between items-center font-medium">
                      <Label className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                        Minimum Price Floor (P_min): £{state.priceControl ?? 50}
                      </Label>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        Surplus: {metrics.shortageOrSurplus > 0 ? `+${metrics.shortageOrSurplus.toFixed(1)} units` : "None"}
                      </span>
                    </div>
                    <Slider
                      value={[state.priceControl ?? 50]}
                      min={30}
                      max={80}
                      step={1}
                      onValueChange={([val]) => setState((s) => ({ ...s, priceControl: val ?? 50 }))}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Must be set above free-market equilibrium to create binding intervention.
                    </p>
                  </div>
                )}

                {state.preset === "tariff" && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <div className="flex justify-between items-center font-medium">
                      <Label className="text-xs text-primary font-bold">
                        Import Tariff Amount: £{state.tariffAmount}
                      </Label>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        Gov Tariff Yield: £{metrics.tariffRevenue.toFixed(0)}
                      </span>
                    </div>
                    <Slider
                      value={[state.tariffAmount]}
                      min={0}
                      max={30}
                      step={1}
                      onValueChange={([val]) => setState((s) => ({ ...s, tariffAmount: val ?? 0 }))}
                    />
                    <div className="rounded-md bg-muted/40 p-2.5 text-[11px] space-y-1">
                      <div className="flex justify-between">
                        <span>Imports without Tariff:</span>
                        <span className="font-semibold">{metrics.importsWithoutTariff.toFixed(1)} units</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Imports with Tariff:</span>
                        <span className="font-semibold text-primary">{metrics.importsWithTariff.toFixed(1)} units</span>
                      </div>
                    </div>
                  </div>
                )}

                {state.preset === "externality" && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <div className="flex justify-between items-center font-medium">
                      <Label className="text-xs text-rose-600 dark:text-rose-400 font-bold">
                        Marginal External Cost (MEC): £{state.externalityCost}
                      </Label>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        MSC = MPC + £{state.externalityCost}
                      </span>
                    </div>
                    <Slider
                      value={[state.externalityCost]}
                      min={0}
                      max={35}
                      step={1}
                      onValueChange={([val]) => setState((s) => ({ ...s, externalityCost: val ?? 0 }))}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Shifts the social cost curve upwards, revealing the welfare loss triangle from market failure.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* CAMBRIDGE EXAMINER TIP BOX */}
            <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 text-xs space-y-1.5">
              <span className="font-semibold text-primary flex items-center gap-1.5">
                <Sparkles className="size-3.5" /> Cambridge Marking Convention Note:
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Cambridge 0455 examiners award up to <strong>4 marks</strong> for diagrams (e.g. 1 mark axes, 1 mark curves, 1 mark shift, 1 mark equilibrium). To secure full credit: always label both axes (P, Q), draw equilibrium drop-lines to the axes (P₁, Q₁), and state the direction of curve shifts explicitly in your written paragraph.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
