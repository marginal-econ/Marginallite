import { describe, expect, it } from "vitest";
import { splitIntoChapters } from "./chapter-split";

describe("splitIntoChapters textbook parser", () => {
  it("splits classic Chapter N headings with titles and prefixes book name", () => {
    const text = `
Chapter 1: Basic Economic Ideas and Resource Allocation
${"Economic scarcity is the fundamental problem. ".repeat(80)}

Chapter 2: The Price System and the Microeconomy
${"Demand and supply interact to establish equilibrium. ".repeat(80)}
`.trim();

    const result = splitIntoChapters(text, "Cambridge 0455 Economics");
    expect(result.length).toBe(2);
    expect(result[0]!.title).toBe(
      "Cambridge 0455 Economics — Chapter 1: Basic Economic Ideas and Resource Allocation",
    );
    expect(result[1]!.title).toBe(
      "Cambridge 0455 Economics — Chapter 2: The Price System and the Microeconomy",
    );
  });

  it("splits Unit N headings and Roman numerals", () => {
    const text = `
Unit I: Microeconomics
${"Consumers maximize utility subject to their budget constraint. ".repeat(80)}

Unit II: Macroeconomics
${"Aggregate demand and aggregate supply determine national income. ".repeat(80)}
`.trim();

    const result = splitIntoChapters(text, "Economics Coursebook");
    expect(result.length).toBe(2);
    expect(result[0]!.title).toBe("Economics Coursebook — Unit I: Microeconomics");
    expect(result[1]!.title).toBe("Economics Coursebook — Unit II: Macroeconomics");
  });

  it("splits word-based number headings (Chapter One, Chapter Two)", () => {
    const text = `
Chapter One: Scarcity and Choice
${"Economic resources are limited while human wants are infinite. ".repeat(80)}

Chapter Two: Demand and Supply Curves
${"The law of demand states that quantity demanded varies inversely with price. ".repeat(80)}
`.trim();

    const result = splitIntoChapters(text, "Hodder Economics");
    expect(result.length).toBe(2);
    expect(result[0]!.title).toBe("Hodder Economics — Chapter One: Scarcity and Choice");
    expect(result[1]!.title).toBe("Hodder Economics — Chapter Two: Demand and Supply Curves");
  });

  it("detects chapter titles separated by blank lines", () => {
    const text = `
CHAPTER 1

Basic Economic Ideas and the Allocation of Resources

${"Production possibility curves illustrate the concept of opportunity cost. ".repeat(80)}

CHAPTER 2

The Price System and Resource Allocation

${"Equilibrium price clears the market without surplus or shortage. ".repeat(80)}
`.trim();

    const result = splitIntoChapters(text, "Oxford Economics");
    expect(result.length).toBe(2);
    expect(result[0]!.title).toBe(
      "Oxford Economics — Chapter 1: Basic Economic Ideas and the Allocation of Resources",
    );
    expect(result[1]!.title).toBe(
      "Oxford Economics — Chapter 2: The Price System and Resource Allocation",
    );
  });

  it("safely ignores Table of Contents lines with leader dots and page numbers", () => {
    const text = `
Table of Contents
Chapter 1: Basic Ideas ................................. 1
Chapter 2: Price Mechanism ............................. 28
Chapter 3: Government Intervention ...................... 55

Chapter 1: Basic Ideas
${"Scarcity is the fundamental economic problem facing every society. ".repeat(80)}

Chapter 2: Price Mechanism
${"Markets determine equilibrium price through interaction of supply and demand. ".repeat(80)}
`.trim();

    const result = splitIntoChapters(text, "Pearson Economics");
    expect(result.length).toBe(2);
    expect(result[0]!.title).toBe("Pearson Economics — Chapter 1: Basic Ideas");
    expect(result[1]!.title).toBe("Pearson Economics — Chapter 2: Price Mechanism");
  });

  it("preserves substantial preamble as an Introduction chapter", () => {
    const introText = "Welcome to Cambridge IGCSE Economics (0455).\n\n".repeat(60);
    const text = `
${introText}

Chapter 1: Basic Ideas
${"Scarcity is the fundamental economic problem facing every society. ".repeat(80)}

Chapter 2: Price Mechanism
${"Markets determine equilibrium price through interaction of supply and demand. ".repeat(80)}
`.trim();

    const result = splitIntoChapters(text, "Cambridge Economics");
    expect(result.length).toBe(3);
    expect(result[0]!.title).toBe("Cambridge Economics — Introduction");
    expect(result[1]!.title).toBe("Cambridge Economics — Chapter 1: Basic Ideas");
    expect(result[2]!.title).toBe("Cambridge Economics — Chapter 2: Price Mechanism");
  });

  it("collapses repeated running page headers into single chapter boundaries", () => {
    const text = `
Chapter 3: Government Micro Intervention
${"Indirect taxes shift the supply curve vertically upwards. ".repeat(40)}

Chapter 3: Government Micro Intervention
${"Subsidies reduce the cost of production for firms. ".repeat(40)}

Chapter 3: Government Micro Intervention
${"Maximum price ceilings create shortages when set below equilibrium. ".repeat(40)}

Chapter 4: The Macroeconomy
${"Circular flow of income models economic injections and leakages. ".repeat(80)}
`.trim();

    const result = splitIntoChapters(text, "Cambridge Coursebook");
    expect(result.length).toBe(2);
    expect(result[0]!.title).toContain("Chapter 3");
    expect(result[1]!.title).toContain("Chapter 4");
  });

  it("safely partitions massive textbooks lacking explicit keywords", () => {
    const chunk =
      "Economics is the study of scarcity, choice, and allocation of resources under constraints.\n\n";
    // 80,000+ characters of content without standard chapter markers
    const hugeText = chunk.repeat(900);

    const result = splitIntoChapters(hugeText, "General Economics Handbook");
    expect(result.length).toBeGreaterThan(1);
    expect(result[0]!.title).toBe("General Economics Handbook — Part 1");
    expect(result[1]!.title).toBe("General Economics Handbook — Part 2");
  });
});
