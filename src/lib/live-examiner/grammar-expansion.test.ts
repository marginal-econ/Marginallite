import { describe, expect, it } from "vitest";
import { analyzeGrammarAndMechanics } from "./grammar-engine";

const flagged = (s: string) => analyzeGrammarAndMechanics([s]).map((i) => `${i.original}=>${i.suggestion}`);

describe("expanded grammar & spelling", () => {
  it.each([
    ["Firms should of raised prices.", "should of=>should have"],
    ["Demand rose alot after the tax.", "alot=>a lot"],
    ["There was a increase in output.", "a increase=>an increase"],
    ["Demand is more elastic then supply.", "elastic then=>elastic than"],
    ["Less firms entered the market.", "Less firms=>Fewer firms"],
    ["The amount of consumers fell.", "amount of consumers=>number of consumers"],
    ["The firm dont raise prices.", "dont=>do not"],
    ["The firm doesn't raise prices.", "doesn't=>does not"],
    ["The prices is rising.", "The prices is=>The prices are"],
    ["The demand are falling.", "The demand are=>The demand is"],
    ["This lead to higher costs.", "This lead to=>This leads to"],
    ["In the other hand, supply rises.", "In the other hand=>On the other hand"],
    ["It was a more cheaper option.", "more cheaper=>cheaper"],
    ["Prices rise,because costs rise.", "rise,because=>rise, because"],
    ["The governmnet taxes scarsity and unemploymnet.", "governmnet=>government"],
    ["Their was a shoratge of resourse.", "shoratge=>shortage"],
    ["Consumers recieve beneifit from comparitive advantage.", "comparitive=>comparative"],
  ])("flags: %s", (sentence, expected) => {
    expect(flagged(sentence).join("|")).toContain(expected);
  });

  it("flags a lowercase sentence start", () => {
    expect(flagged("demand falls when prices rise.").join("|")).toContain("demand=>Demand");
  });

  it.each([
    "Supply and demand are determined by price.",
    "The price of goods is set by the market.",
    "The government are considering a tax.".replace("are", "is"),
    "This increase in price leads to a fall in demand.",
    "Both firms and consumers are affected, i.e. the market adjusts.",
    "An increase in income raises demand for normal goods.",
    "PED is higher than 1, so demand is elastic.",
    "Revenue rises, then falls as the price increases further.",
    "The 1,000 firms exit, and fewer firms remain.",
    "Ceteris paribus, an economic shock reduces output.",
    "A tax of 20% is imposed on the good.",
    "I believe that market failure requires government intervention.",
    "In this essay, I will evaluate the extent of deadweight loss.",
    "Firm i and Firm j compete under Cournot oligopoly.",
    "Then i argue that tax falls.",
    "As illustrated in diagram i, the subsidy shifts supply outward.",
  ])("does not flag correct writing: %s", (sentence) => {
    expect(flagged(sentence)).toEqual([]);
  });

  it("handles Roman numeral and list splitting without fragmenting on capital I", async () => {
    const { splitSentences } = await import("@/lib/writing-check/sentence-diff");
    const text = "I. First point of the economic analysis. II. Second point regarding tariffs.";
    const result = splitSentences(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("I. First point of the economic analysis.");
    expect(result[1]).toBe("II. Second point regarding tariffs.");
  });
});
