import { useState, useEffect, useRef, useCallback } from "react";
import {
  Calculator as CalcIcon,
  X,
  Minus,
  Percent,
  Copy,
  Check,
  History,
  TrendingUp,
  Sparkles,
  BookOpen,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CalculationHistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: Date;
}

interface McqCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

/**
 * Robust mathematical expression evaluator.
 * Supports +, -, *, /, ^, %, unary minus, parentheses, and clean decimal rounding.
 * Never throws an uncaught error; handles division by zero safely.
 */
function safeEvaluate(rawExpr: string): string {
  if (!rawExpr || typeof rawExpr !== "string") return "0";

  // Normalize operators
  let expr = rawExpr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/,/g, ".")
    .trim();

  // If expression contains '=', take the rightmost non-empty clause or the clause before '='
  if (expr.includes("=")) {
    const parts = expr.split("=");
    const lastPart = parts[parts.length - 1].trim();
    expr = lastPart || parts[0].trim();
  }

  // Strip trailing dangling operators (e.g. "10 +" or "10 /")
  expr = expr.replace(/[+\-*/^]+$/, "").trim();
  if (!expr) return "0";

  // Balance unclosed parentheses
  let openCount = 0;
  for (const ch of expr) {
    if (ch === "(") openCount++;
    if (ch === ")") openCount--;
  }
  while (openCount > 0) {
    expr += ")";
    openCount--;
  }

  // Tokenize
  const tokens: Array<
    | { type: "number"; value: number }
    | { type: "operator"; value: string }
    | { type: "unary"; value: "-" }
    | { type: "paren"; value: string }
    | { type: "percent" }
  > = [];

  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let numStr = "";
      let hasDot = false;
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        if (expr[i] === ".") {
          if (hasDot) {
            i++;
            continue;
          }
          hasDot = true;
        }
        numStr += expr[i];
        i++;
      }
      const parsed = parseFloat(numStr);
      tokens.push({ type: "number", value: isNaN(parsed) ? 0 : parsed });
      continue;
    }
    if (ch === "%") {
      tokens.push({ type: "percent" });
      i++;
      continue;
    }
    if ("+-*/^()".includes(ch)) {
      if (ch === "-") {
        const prev = tokens[tokens.length - 1];
        if (!prev || prev.type === "operator" || (prev.type === "paren" && prev.value === "(")) {
          tokens.push({ type: "unary", value: "-" });
          i++;
          continue;
        }
      }
      if (ch === "(") {
        // Implicit multiplication: e.g. 2(3) -> 2 * (3)
        if (tokens.length > 0) {
          const prev = tokens[tokens.length - 1];
          if (prev.type === "number" || (prev.type === "paren" && prev.value === ")")) {
            tokens.push({ type: "operator", value: "*" });
          }
        }
        tokens.push({ type: "paren", value: ch });
      } else if (ch === ")") {
        tokens.push({ type: "paren", value: ch });
      } else {
        tokens.push({ type: "operator", value: ch });
      }
      i++;
      continue;
    }
    return "Error";
  }

  // Shunting-yard algorithm
  const precedence: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3, "u-": 4 };
  const associativity: Record<string, "L" | "R"> = {
    "+": "L",
    "-": "L",
    "*": "L",
    "/": "L",
    "^": "R",
    "u-": "R",
  };
  const outputQueue: typeof tokens = [];
  const operatorStack: typeof tokens = [];

  for (let idx = 0; idx < tokens.length; idx++) {
    const token = tokens[idx];
    if (token.type === "number") {
      outputQueue.push(token);
    } else if (token.type === "percent") {
      outputQueue.push({ type: "operator", value: "%" });
    } else if (token.type === "unary") {
      operatorStack.push({ type: "operator", value: "u-" });
    } else if (token.type === "operator") {
      while (operatorStack.length > 0) {
        const top = operatorStack[operatorStack.length - 1];
        if (top.type === "operator") {
          const p1 = precedence[token.value];
          const p2 = precedence[top.value];
          const assoc = associativity[token.value];
          if ((assoc === "L" && p1 <= p2) || (assoc === "R" && p1 < p2)) {
            outputQueue.push(operatorStack.pop()!);
            continue;
          }
        }
        break;
      }
      operatorStack.push(token);
    } else if (token.type === "paren" && token.value === "(") {
      operatorStack.push(token);
    } else if (token.type === "paren" && token.value === ")") {
      let foundOpen = false;
      while (operatorStack.length > 0) {
        const top = operatorStack.pop()!;
        if (top.type === "paren" && top.value === "(") {
          foundOpen = true;
          break;
        }
        outputQueue.push(top);
      }
      if (!foundOpen) return "Error";
    }
  }

  while (operatorStack.length > 0) {
    const top = operatorStack.pop()!;
    if (top.type === "paren") return "Error";
    outputQueue.push(top);
  }

  // Evaluate RPN
  const evalStack: number[] = [];
  for (const token of outputQueue) {
    if (token.type === "number") {
      evalStack.push(token.value);
    } else if (token.type === "operator") {
      if (token.value === "%") {
        if (evalStack.length < 1) return "Error";
        evalStack.push(evalStack.pop()! / 100);
      } else if (token.value === "u-") {
        if (evalStack.length < 1) return "Error";
        evalStack.push(-evalStack.pop()!);
      } else {
        if (evalStack.length < 2) return "Error";
        const b = evalStack.pop()!;
        const a = evalStack.pop()!;
        let res = 0;
        if (token.value === "+") res = a + b;
        else if (token.value === "-") res = a - b;
        else if (token.value === "*") res = a * b;
        else if (token.value === "/") {
          if (Math.abs(b) < 1e-12) return "Cannot divide by 0";
          res = a / b;
        } else if (token.value === "^") res = Math.pow(a, b);
        evalStack.push(res);
      }
    }
  }

  if (evalStack.length !== 1) return "Error";
  const finalNum = evalStack[0];
  if (!Number.isFinite(finalNum)) return "Error";

  // Limit float inaccuracies up to 10 decimal digits
  const rounded = Number(finalNum.toFixed(10));
  return String(rounded);
}

export function McqCalculator({ isOpen, onClose, className }: McqCalculatorProps) {
  const [activeTab, setActiveTab] = useState<"standard" | "formulas" | "history">("standard");
  const [display, setDisplay] = useState<string>("0");
  const [expression, setExpression] = useState<string>("");
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);
  const [justCalculated, setJustCalculated] = useState<boolean>(false);
  const [memory, setMemory] = useState<number | null>(null);
  const [history, setHistory] = useState<CalculationHistoryItem[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Quick Economics Formula States
  // 1. Percentage Change
  const [pctOld, setPctOld] = useState<string>("");
  const [pctNew, setPctNew] = useState<string>("");
  const [pctResult, setPctResult] = useState<{ value: number; label: string } | null>(null);

  // 2. PED (Price Elasticity of Demand)
  const [pedDeltaQ, setPedDeltaQ] = useState<string>("");
  const [pedDeltaP, setPedDeltaP] = useState<string>("");
  const [pedResult, setPedResult] = useState<{
    value: number;
    magnitude: number;
    type: "elastic" | "inelastic" | "unit" | "perfectly_inelastic" | "perfectly_elastic";
    commentary: string;
  } | null>(null);

  // 3. Multiplier (k = 1 / (1 - MPC))
  const [mpcVal, setMpcVal] = useState<string>("");
  const [multiplierResult, setMultiplierResult] = useState<{ k: number; commentary: string } | null>(null);

  // 4. Real GDP / Inflation Index
  const [nomVal, setNomVal] = useState<string>("");
  const [priceIndex, setPriceIndex] = useState<string>("100");
  const [realResult, setRealResult] = useState<{ real: number; inflationDeflator: number } | null>(null);

  // Dragging support
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const isErrorDisplay = display === "Error" || display === "Cannot divide by 0";

  // Digit handler
  const handleDigit = useCallback(
    (digit: string) => {
      if (isErrorDisplay || justCalculated) {
        setJustCalculated(false);
        setWaitingForOperand(false);
        setExpression("");
        setDisplay(digit === "." ? "0." : digit);
        return;
      }

      if (waitingForOperand) {
        setWaitingForOperand(false);
        setDisplay(digit === "." ? "0." : digit);
        return;
      }

      if (digit === ".") {
        if (display.includes(".")) return;
        setDisplay((prev) => prev + ".");
        return;
      }

      if (display === "0") {
        setDisplay(digit);
        return;
      }

      if (display.length >= 16) return;
      setDisplay((prev) => prev + digit);
    },
    [display, isErrorDisplay, justCalculated, waitingForOperand]
  );

  // Operator handler (+, −, ×, ÷, ^)
  const handleOperator = useCallback(
    (op: string) => {
      if (isErrorDisplay) {
        setDisplay("0");
        setExpression(`0 ${op}`);
        setWaitingForOperand(true);
        setJustCalculated(false);
        return;
      }

      if (justCalculated) {
        // Continue calculation from previous answer
        setJustCalculated(false);
        setExpression(`${display} ${op}`);
        setWaitingForOperand(true);
        return;
      }

      if (waitingForOperand) {
        // User changed operator (e.g. clicked + then ÷); replace the operator without inserting 0!
        setExpression((prev) => {
          const trimmed = prev.trim();
          const replaced = trimmed.replace(/[+\−×÷\-\*\/^]$/, op);
          return `${replaced} `;
        });
        return;
      }

      // Normal operator transition: evaluate running subtotal if expression exists
      if (expression) {
        const intermediate = safeEvaluate(`${expression} ${display}`);
        if (intermediate !== "Error" && intermediate !== "Cannot divide by 0") {
          setDisplay(intermediate);
        }
        setExpression(`${expression} ${display} ${op}`);
      } else {
        setExpression(`${display} ${op}`);
      }

      setWaitingForOperand(true);
    },
    [display, expression, isErrorDisplay, justCalculated, waitingForOperand]
  );

  // Equals handler
  const handleEquals = useCallback(() => {
    if (justCalculated) return;
    if (isErrorDisplay) return;

    let fullExpr = "";
    if (expression) {
      if (waitingForOperand) {
        // e.g. "10 ÷" and user presses = -> evaluate with current display
        fullExpr = `${expression} ${display}`.trim();
      } else {
        fullExpr = `${expression} ${display}`.trim();
      }
    } else {
      fullExpr = display;
    }

    const res = safeEvaluate(fullExpr);

    if (res === "Cannot divide by 0") {
      setDisplay("Cannot divide by 0");
      setExpression(`${fullExpr} =`);
      setJustCalculated(true);
      setWaitingForOperand(false);
      toast.error("Cannot divide by zero");
    } else if (res !== "Error") {
      setHistory((prev) => [
        {
          id: Math.random().toString(36).slice(2, 9),
          expression: fullExpr,
          result: res,
          timestamp: new Date(),
        },
        ...prev.slice(0, 19),
      ]);
      setExpression(`${fullExpr} =`);
      setDisplay(res);
      setJustCalculated(true);
      setWaitingForOperand(false);
    } else {
      setDisplay("Error");
      setJustCalculated(true);
      setWaitingForOperand(false);
    }
  }, [display, expression, isErrorDisplay, justCalculated, waitingForOperand]);

  // Clear handler (AC)
  const handleClear = useCallback(() => {
    setDisplay("0");
    setExpression("");
    setWaitingForOperand(false);
    setJustCalculated(false);
  }, []);

  // Backspace handler
  const handleBackspace = useCallback(() => {
    if (justCalculated || isErrorDisplay) {
      handleClear();
      return;
    }
    if (waitingForOperand) {
      setExpression((prev) => prev.replace(/[+\−×÷\-\*\/^]\s*$/, "").trim());
      setWaitingForOperand(false);
      return;
    }
    setDisplay((prev) => {
      if (prev.length <= 1 || prev === "-") return "0";
      return prev.slice(0, -1);
    });
  }, [justCalculated, isErrorDisplay, waitingForOperand, handleClear]);

  // Sign toggle (±)
  const handleToggleSign = useCallback(() => {
    if (isErrorDisplay || display === "0") return;
    setDisplay((prev) => {
      if (prev.startsWith("-")) return prev.slice(1);
      return `-${prev}`;
    });
    if (justCalculated) {
      setExpression("");
      setJustCalculated(false);
    }
  }, [display, isErrorDisplay, justCalculated]);

  // Percentage handler (%)
  const handlePercentage = useCallback(() => {
    if (isErrorDisplay) return;
    const num = parseFloat(display);
    if (isNaN(num)) return;
    const res = Number((num / 100).toFixed(10));
    setDisplay(String(res));
  }, [display, isErrorDisplay]);

  // Parentheses handlers
  const handleOpenParen = useCallback(() => {
    if (justCalculated || isErrorDisplay) {
      setExpression("(");
      setDisplay("0");
      setWaitingForOperand(true);
      setJustCalculated(false);
      return;
    }

    setExpression((prev) => {
      if (!prev || prev.endsWith("(") || /[+\−×÷\-\*\/^]\s*$/.test(prev)) {
        return `${prev}(`;
      }
      return `${prev} × (`;
    });
    setWaitingForOperand(true);
  }, [justCalculated, isErrorDisplay]);

  const handleCloseParen = useCallback(() => {
    const openCount = (expression.match(/\(/g) || []).length;
    const closeCount = (expression.match(/\)/g) || []).length;
    if (openCount <= closeCount) return;

    if (waitingForOperand && /[+\−×÷\-\*\/^]\s*$/.test(expression)) {
      return;
    }

    const nextExpr = waitingForOperand ? `${expression})` : `${expression} ${display})`;
    setExpression(nextExpr);

    const inner = safeEvaluate(nextExpr);
    if (inner !== "Error" && inner !== "Cannot divide by 0") {
      setDisplay(inner);
    }
    setWaitingForOperand(false);
  }, [expression, display, waitingForOperand]);

  // Keyboard navigation & global shortcuts
  useEffect(() => {
    if (!isOpen || isMinimized) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if student is typing in an input or textarea
      const target = e.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName;
        if (tagName === "INPUT" || tagName === "TEXTAREA" || target.isContentEditable) {
          return;
        }
      }

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === "." || e.key === ",") {
        e.preventDefault();
        handleDigit(".");
      } else if (e.key === "+") {
        e.preventDefault();
        handleOperator("+");
      } else if (e.key === "-") {
        e.preventDefault();
        handleOperator("−");
      } else if (e.key === "*" || e.key === "x" || e.key === "X") {
        e.preventDefault();
        handleOperator("×");
      } else if (e.key === "/" || e.code === "NumpadDivide") {
        e.preventDefault();
        handleOperator("÷");
      } else if (e.key === "^") {
        e.preventDefault();
        handleOperator("^");
      } else if (e.key === "(") {
        e.preventDefault();
        handleOpenParen();
      } else if (e.key === ")") {
        e.preventDefault();
        handleCloseParen();
      } else if (e.key === "%") {
        e.preventDefault();
        handlePercentage();
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        handleEquals();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "c" || e.key === "C" || e.key === "Delete") {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    isOpen,
    isMinimized,
    handleDigit,
    handleOperator,
    handleEquals,
    handleBackspace,
    handleClear,
    handleOpenParen,
    handleCloseParen,
    handlePercentage,
    onClose,
  ]);

  // Copy current display
  const copyDisplay = () => {
    if (isErrorDisplay) return;
    navigator.clipboard.writeText(display);
    setCopied(true);
    toast.success(`Copied: ${display}`);
    setTimeout(() => setCopied(false), 1800);
  };

  // Push result to display from Formulas or History
  const sendToDisplay = useCallback((val: number | string) => {
    setDisplay(val.toString());
    setExpression("");
    setWaitingForOperand(false);
    setJustCalculated(true);
    setActiveTab("standard");
    toast.info(`Inserted ${val} into desk calculator.`);
  }, []);

  // Formula Solvers
  const computePctChange = () => {
    const o = parseFloat(pctOld);
    const n = parseFloat(pctNew);
    if (isNaN(o) || isNaN(n) || o === 0) {
      toast.error("Enter valid numeric old and new values (old ≠ 0).");
      return;
    }
    const delta = ((n - o) / Math.abs(o)) * 100;
    const sign = delta > 0 ? "+" : "";
    setPctResult({
      value: Number(delta.toFixed(3)),
      label: `${sign}${delta.toFixed(2)}%`,
    });
  };

  const computePed = () => {
    const dq = parseFloat(pedDeltaQ);
    const dp = parseFloat(pedDeltaP);
    if (isNaN(dq) || isNaN(dp) || dp === 0) {
      toast.error("Enter valid % change in Quantity and Price (%ΔP ≠ 0).");
      return;
    }
    const ped = dq / dp;
    const mag = Math.abs(ped);
    const roundedMag = Number(mag.toFixed(3));

    let type: "elastic" | "inelastic" | "unit" | "perfectly_inelastic" | "perfectly_elastic" = "inelastic";
    let commentary = "";

    if (roundedMag === 0) {
      type = "perfectly_inelastic";
      commentary = "Perfectly Inelastic (|PED| = 0). Demand curve is vertical.";
    } else if (roundedMag === 1) {
      type = "unit";
      commentary = "Unit Elastic (|PED| = 1). %ΔQ equals %ΔP. Total revenue is maximized.";
    } else if (roundedMag > 1) {
      type = "elastic";
      commentary = "Price Elastic (|PED| > 1). Demand is responsive. Lowering price increases Total Revenue.";
    } else {
      type = "inelastic";
      commentary = "Price Inelastic (|PED| < 1). Demand is unresponsive. Raising price increases Total Revenue.";
    }

    setPedResult({
      value: Number(ped.toFixed(3)),
      magnitude: roundedMag,
      type,
      commentary,
    });
  };

  const computeMultiplier = () => {
    const mpc = parseFloat(mpcVal);
    if (isNaN(mpc) || mpc >= 1 || mpc <= 0) {
      toast.error("Enter a valid Marginal Propensity to Consume (0 < MPC < 1).");
      return;
    }
    const k = 1 / (1 - mpc);
    setMultiplierResult({
      k: Number(k.toFixed(3)),
      commentary: `Multiplier k = 1 / (1 - ${mpc}) = ${k.toFixed(2)}. An injection of $100m yields an equilibrium income expansion of $${(100 * k).toFixed(1)}m.`,
    });
  };

  const computeRealGdp = () => {
    const nom = parseFloat(nomVal);
    const idx = parseFloat(priceIndex);
    if (isNaN(nom) || isNaN(idx) || idx <= 0) {
      toast.error("Enter valid nominal output and positive price index (> 0).");
      return;
    }
    const real = (nom / idx) * 100;
    const deflator = idx;
    setRealResult({
      real: Number(real.toFixed(2)),
      inflationDeflator: deflator,
    });
  };

  // Reposition within safe viewport boundaries on screen resize or orientation change
  useEffect(() => {
    const handleViewportChange = () => {
      setPosition((prev) => {
        if (!prev) return prev;
        const cardWidth = cardRef.current?.offsetWidth || 340;
        const cardHeight = cardRef.current?.offsetHeight || 420;
        const maxX = Math.max(8, window.innerWidth - cardWidth - 8);
        const maxY = Math.max(8, window.innerHeight - cardHeight - 8);
        return {
          x: Math.min(Math.max(8, prev.x), maxX),
          y: Math.min(Math.max(8, prev.y), maxY),
        };
      });
    };
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
    };
  }, []);

  // Drag listeners for mouse
  const startDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, input, select, [role='tab']")) return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position ? position.x : rect.left,
      posY: position ? position.y : rect.top,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = moveEvent.clientX - dragRef.current.startX;
      const dy = moveEvent.clientY - dragRef.current.startY;
      const cardW = cardRef.current?.offsetWidth || 340;
      const newX = Math.max(8, Math.min(window.innerWidth - cardW - 8, dragRef.current.posX + dx));
      const newY = Math.max(8, Math.min(window.innerHeight - 100, dragRef.current.posY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Touch drag listener for mobile & tablet touchscreens
  const startTouchDrag = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button, input, select, [role='tab']")) return;
    const touch = e.touches[0];
    if (!touch) return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      posX: position ? position.x : rect.left,
      posY: position ? position.y : rect.top,
    };

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (!dragRef.current) return;
      const t = moveEvent.touches[0];
      if (!t) return;
      const dx = t.clientX - dragRef.current.startX;
      const dy = t.clientY - dragRef.current.startY;
      const cardW = cardRef.current?.offsetWidth || 340;
      const newX = Math.max(8, Math.min(window.innerWidth - cardW - 8, dragRef.current.posX + dx));
      const newY = Math.max(8, Math.min(window.innerHeight - 100, dragRef.current.posY + dy));
      setPosition({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
      dragRef.current = null;
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
  };

  if (!isOpen) return null;

  // Minimized floating pill (positioned safely above mobile docks)
  if (isMinimized) {
    return (
      <div
        className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-50 animate-in fade-in zoom-in-95 cursor-pointer select-none"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-card/95 border border-primary/30 text-foreground shadow-2xl backdrop-blur-xl hover:border-primary transition-all group">
          <div className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
            <CalcIcon className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Cambridge Calculator
            </span>
            <span className="font-mono text-xs font-bold text-foreground">
              {display !== "0" && !isErrorDisplay ? display : "Ready"}
            </span>
          </div>
          <Maximize2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors ml-1" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      style={
        position
          ? { left: `${position.x}px`, top: `${position.y}px`, position: "fixed" }
          : undefined
      }
      className={cn(
        "z-50 w-[calc(100vw-1.5rem)] sm:w-[380px] max-w-sm bg-card/95 text-foreground border border-border/80 rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden transition-shadow duration-200 select-none animate-in fade-in slide-in-from-bottom-3",
        !position && "fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 mx-auto sm:mx-0",
        className
      )}
    >
      {/* Draggable Header with Touch + Mouse support */}
      <div
        onMouseDown={startDrag}
        onTouchStart={startTouchDrag}
        className="flex items-center justify-between p-3.5 px-4 bg-muted/40 border-b border-border/70 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <CalcIcon className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold tracking-tight text-foreground">Cambridge IGCSE 0455 Calc</h4>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 text-primary bg-primary/5">
                Official Exam Desk
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">Cambridge IGCSE 0455 Multiple Choice</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsMinimized(true)}
            className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
            title="Minimize to floating bubble"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-7 w-7 text-muted-foreground hover:text-rose-500 rounded-lg"
            title="Close calculator (Esc)"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as any)}
        className="flex flex-col flex-1"
      >
        <div className="px-3 pt-2 bg-muted/20 border-b border-border/40">
          <TabsList className="grid grid-cols-3 h-8 bg-muted/60 p-0.5 rounded-xl">
            <TabsTrigger
              value="standard"
              className="text-[11px] font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs rounded-lg"
            >
              Standard
            </TabsTrigger>
            <TabsTrigger
              value="formulas"
              className="text-[11px] font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs rounded-lg"
            >
              Econ Solvers
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="text-[11px] font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs rounded-lg flex items-center gap-1"
            >
              <History className="h-3 w-3" />
              <span>History</span>
              {history.length > 0 && (
                <span className="h-4 w-4 rounded-full bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center">
                  {history.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: STANDARD ARITHMETIC DESK CALCULATOR */}
        <TabsContent value="standard" className="p-3.5 space-y-3 m-0 flex flex-col focus-visible:outline-none">
          {/* Display Screen */}
          <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/80 shadow-inner flex flex-col justify-between min-h-[82px] text-right relative overflow-hidden">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <div className="flex items-center gap-1">
                {memory !== null && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-primary/40 text-primary">
                    M: {memory}
                  </Badge>
                )}
              </div>
              <span className="truncate max-w-[240px] text-muted-foreground/80 font-mono">
                {expression || "\u00A0"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 mt-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={copyDisplay}
                className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md shrink-0"
                title="Copy current value"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              </Button>

              <div
                className={cn(
                  "font-mono font-bold tracking-tight truncate",
                  isErrorDisplay ? "text-rose-500 text-lg" : "text-foreground",
                  !isErrorDisplay && (display.length > 16 ? "text-lg" : display.length > 12 ? "text-xl" : display.length > 8 ? "text-2xl" : "text-3xl")
                )}
              >
                {display}
              </div>
            </div>
          </div>

          {/* Keypad Grid */}
          <div className="grid grid-cols-4 gap-1.5 text-xs font-semibold">
            {/* Row 1: Memory & Clear */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMemory(null);
                toast.info("Memory cleared");
              }}
              className="h-9 text-[11px] font-bold bg-muted/40 hover:bg-muted text-muted-foreground"
            >
              MC
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (memory !== null) {
                  setDisplay(memory.toString());
                  setWaitingForOperand(false);
                  setJustCalculated(true);
                }
              }}
              className="h-9 text-[11px] font-bold bg-muted/40 hover:bg-muted text-muted-foreground"
            >
              MR
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const n = parseFloat(display);
                if (!isNaN(n)) {
                  setMemory((prev) => (prev ?? 0) + n);
                  toast.success(`M+ added (${display})`);
                }
              }}
              className="h-9 text-[11px] font-bold bg-muted/40 hover:bg-muted text-muted-foreground"
            >
              M+
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="h-9 text-[11px] font-bold text-rose-500 hover:text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30"
              title="Clear all (AC)"
            >
              AC
            </Button>

            {/* Row 2: Parentheses, %, Division */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenParen}
              className="h-9 font-mono bg-card hover:bg-muted"
            >
              (
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCloseParen}
              className="h-9 font-mono bg-card hover:bg-muted"
            >
              )
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePercentage}
              className="h-9 font-mono bg-card hover:bg-muted text-muted-foreground"
            >
              %
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOperator("÷")}
              className={cn(
                "h-9 font-mono text-primary font-bold bg-primary/10 hover:bg-primary/20 border-primary/20 transition-all",
                waitingForOperand && expression.trim().endsWith("÷") && "bg-primary text-primary-foreground border-primary"
              )}
            >
              ÷
            </Button>

            {/* Row 3: 7, 8, 9, × */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit("7")}
              className="h-10 text-sm font-bold bg-card hover:bg-muted"
            >
              7
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit("8")}
              className="h-10 text-sm font-bold bg-card hover:bg-muted"
            >
              8
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit("9")}
              className="h-10 text-sm font-bold bg-card hover:bg-muted"
            >
              9
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOperator("×")}
              className={cn(
                "h-10 font-mono text-primary font-bold bg-primary/10 hover:bg-primary/20 border-primary/20 transition-all",
                waitingForOperand && expression.trim().endsWith("×") && "bg-primary text-primary-foreground border-primary"
              )}
            >
              ×
            </Button>

            {/* Row 4: 4, 5, 6, − */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit("4")}
              className="h-10 text-sm font-bold bg-card hover:bg-muted"
            >
              4
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit("5")}
              className="h-10 text-sm font-bold bg-card hover:bg-muted"
            >
              5
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit("6")}
              className="h-10 text-sm font-bold bg-card hover:bg-muted"
            >
              6
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOperator("−")}
              className={cn(
                "h-10 font-mono text-primary font-bold bg-primary/10 hover:bg-primary/20 border-primary/20 transition-all",
                waitingForOperand && expression.trim().endsWith("−") && "bg-primary text-primary-foreground border-primary"
              )}
            >
              −
            </Button>

            {/* Row 5: 1, 2, 3, + */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit("1")}
              className="h-10 text-sm font-bold bg-card hover:bg-muted"
            >
              1
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit("2")}
              className="h-10 text-sm font-bold bg-card hover:bg-muted"
            >
              2
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit("3")}
              className="h-10 text-sm font-bold bg-card hover:bg-muted"
            >
              3
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOperator("+")}
              className={cn(
                "h-10 font-mono text-primary font-bold bg-primary/10 hover:bg-primary/20 border-primary/20 transition-all",
                waitingForOperand && expression.trim().endsWith("+") && "bg-primary text-primary-foreground border-primary"
              )}
            >
              +
            </Button>

            {/* Row 6: ±, 0, ., = */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleSign}
              className="h-10 font-mono bg-card hover:bg-muted text-muted-foreground"
            >
              ±
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit("0")}
              className="h-10 text-sm font-bold bg-card hover:bg-muted"
            >
              0
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDigit(".")}
              className="h-10 font-bold bg-card hover:bg-muted"
            >
              .
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleEquals}
              className="h-10 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/25"
            >
              =
            </Button>
          </div>

          {/* Quick Helper Shortcut Footer */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
            <span>Type keys directly or press Alt+C</span>
            <button
              onClick={handleBackspace}
              className="hover:text-foreground flex items-center gap-1 font-mono cursor-pointer"
            >
              <span>Backspace (⌫)</span>
            </button>
          </div>
        </TabsContent>

        {/* TAB 2: Cambridge IGCSE 0455 ECONOMICS FORMULA SOLVERS */}
        <TabsContent value="formulas" className="p-3.5 space-y-4 m-0 overflow-y-auto max-h-[360px] focus-visible:outline-none">
          {/* Formula 1: % Change */}
          <div className="p-3 rounded-2xl bg-muted/30 border border-border/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-primary" />
                Percentage Change
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">((New - Old)/|Old|) × 100</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Old Value</Label>
                <Input
                  type="number"
                  data-calc-input="true"
                  placeholder="e.g. 100"
                  value={pctOld}
                  onChange={(e) => setPctOld(e.target.value)}
                  className="h-7 text-xs bg-card"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">New Value</Label>
                <Input
                  type="number"
                  data-calc-input="true"
                  placeholder="e.g. 125"
                  value={pctNew}
                  onChange={(e) => setPctNew(e.target.value)}
                  className="h-7 text-xs bg-card"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button size="sm" onClick={computePctChange} className="h-7 text-xs font-semibold px-3">
                Calculate %Δ
              </Button>
              {pctResult && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-primary">{pctResult.label}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendToDisplay(pctResult.value)}
                    className="h-6 text-[10px] px-2"
                    title="Insert into desk calculator"
                  >
                    Insert
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Formula 2: PED / PES / YED Elasticities */}
          <div className="p-3 rounded-2xl bg-muted/30 border border-border/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-primary" />
                Elasticity Solver (PED / PES)
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">%ΔQ / %ΔP</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">%Δ Quantity (Q)</Label>
                <Input
                  type="number"
                  data-calc-input="true"
                  placeholder="e.g. -15"
                  value={pedDeltaQ}
                  onChange={(e) => setPedDeltaQ(e.target.value)}
                  className="h-7 text-xs bg-card"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">%Δ Price (P)</Label>
                <Input
                  type="number"
                  data-calc-input="true"
                  placeholder="e.g. +10"
                  value={pedDeltaP}
                  onChange={(e) => setPedDeltaP(e.target.value)}
                  className="h-7 text-xs bg-card"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button size="sm" onClick={computePed} className="h-7 text-xs font-semibold px-3">
                Evaluate Elasticity
              </Button>
              {pedResult && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-primary">{pedResult.value}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendToDisplay(pedResult.value)}
                    className="h-6 text-[10px] px-2"
                  >
                    Insert
                  </Button>
                </div>
              )}
            </div>

            {pedResult && (
              <div className="p-2 rounded-xl bg-background/80 border border-border text-[11px] space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 border-primary/40 text-primary">
                    {pedResult.type.replace("_", " ")}
                  </Badge>
                  <span>Magnitude |PED| = {pedResult.magnitude}</span>
                </div>
                <p className="text-muted-foreground text-[10px] leading-snug">{pedResult.commentary}</p>
              </div>
            )}
          </div>

          {/* Formula 3: Multiplier (k) */}
          <div className="p-3 rounded-2xl bg-muted/30 border border-border/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Keynesian Multiplier (k)
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">k = 1 / (1 - MPC)</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-[10px] text-muted-foreground">Marginal Propensity to Consume (MPC)</Label>
                <Input
                  type="number"
                  step="0.05"
                  data-calc-input="true"
                  placeholder="e.g. 0.8"
                  value={mpcVal}
                  onChange={(e) => setMpcVal(e.target.value)}
                  className="h-7 text-xs bg-card"
                />
              </div>
              <Button size="sm" onClick={computeMultiplier} className="h-7 text-xs font-semibold mt-4">
                Calculate k
              </Button>
            </div>

            {multiplierResult && (
              <div className="p-2 rounded-xl bg-background/80 border border-border text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Multiplier k = {multiplierResult.k}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendToDisplay(multiplierResult.k)}
                    className="h-5 text-[9px] px-1.5"
                  >
                    Insert k
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">{multiplierResult.commentary}</p>
              </div>
            )}
          </div>

          {/* Formula 4: Real GDP / Deflator */}
          <div className="p-3 rounded-2xl bg-muted/30 border border-border/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                Real GDP & Inflation Deflator
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">(Nominal / Index) × 100</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Nominal GDP ($m)</Label>
                <Input
                  type="number"
                  data-calc-input="true"
                  placeholder="e.g. 550"
                  value={nomVal}
                  onChange={(e) => setNomVal(e.target.value)}
                  className="h-7 text-xs bg-card"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Price Index (Base 100)</Label>
                <Input
                  type="number"
                  data-calc-input="true"
                  placeholder="e.g. 110"
                  value={priceIndex}
                  onChange={(e) => setPriceIndex(e.target.value)}
                  className="h-7 text-xs bg-card"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <Button size="sm" onClick={computeRealGdp} className="h-7 text-xs font-semibold px-3">
                Compute Real GDP
              </Button>
              {realResult && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-primary">${realResult.real}m</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendToDisplay(realResult.real)}
                    className="h-6 text-[10px] px-2"
                  >
                    Insert
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: CALCULATION TAPE & AUDIT LOG */}
        <TabsContent value="history" className="p-3.5 space-y-3 m-0 overflow-y-auto max-h-[360px] focus-visible:outline-none">
          <div className="flex items-center justify-between text-xs text-muted-foreground pb-1 border-b border-border/40">
            <span>Recent Exam Calculations</span>
            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                className="text-[11px] text-rose-500 hover:underline cursor-pointer"
              >
                Clear History
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-1">
              <History className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-xs font-semibold text-foreground">No calculations logged yet</p>
              <p className="text-[11px] text-muted-foreground">
                Expressions solved on the keypad or formula solvers will record here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => sendToDisplay(item.result)}
                  className="p-2.5 rounded-xl bg-muted/30 border border-border/70 hover:border-primary/50 hover:bg-muted/60 transition-all cursor-pointer group flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono text-muted-foreground truncate">{item.expression}</div>
                    <div className="font-mono text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      = {item.result}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0 font-mono">
                    {item.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
