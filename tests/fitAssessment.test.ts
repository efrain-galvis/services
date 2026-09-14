import { describe, expect, it } from "vitest";
import {
  adaptFitAssessment,
  findFitAssessment,
  fitLabel,
  scoreBand,
} from "../src/fitAssessment";

describe("fit assessment scoring", () => {
  it.each([
    [92, "strong"],
    [75, "strong"],
    [74, "partial"],
    [50, "partial"],
    [49, "gap"],
  ] as const)("classifies %i as %s", (score, expected) => {
    expect(scoreBand(score)).toBe(expected);
  });

  it.each([
    [80, "Strong fit"],
    [60, "Good fit"],
    [40, "Partial fit"],
    [39, "Limited fit"],
  ] as const)("labels %i as %s", (score, expected) => {
    expect(fitLabel(score)).toBe(expected);
  });
});

describe("fit assessment adapter", () => {
  it("normalizes the site-agent schema and fractional scores", () => {
    expect(
      adaptFitAssessment({
        role_title: "AI Lead",
        overall_score: 0.82,
        label: "",
        dimensions: [
          { category: "Systems", score: 0.9, evidence: ["Shipped agents"] },
        ],
        matches: ["Production ownership"],
        gaps: [{ title: "Industry depth", reason: "Not enough evidence" }],
        summary: "A strong match.",
      }),
    ).toEqual({
      roleTitle: "AI Lead",
      overallScore: 82,
      label: "Strong fit",
      dimensions: [
        { name: "Systems", score: 90, evidence: ["Shipped agents"] },
      ],
      matches: [{ title: "Production ownership", evidence: [] }],
      gaps: [
        { title: "Industry depth", evidence: ["Not enough evidence"] },
      ],
      summary: "A strong match.",
    });
  });

  it("finds JSON embedded in a nested tool result", () => {
    const assessment = findFitAssessment({
      role: "tool",
      content: JSON.stringify({
        fit_assessment: {
          role_title: "Staff Engineer",
          overall_score: 76,
          dimensions: [{ name: "Architecture", score: 81 }],
          matches: [],
          gaps: [],
          summary: "",
        },
      }),
    });

    expect(assessment?.roleTitle).toBe("Staff Engineer");
    expect(assessment?.overallScore).toBe(76);
  });

  it("rejects unrelated or dimensionless objects", () => {
    expect(adaptFitAssessment({ overall_score: 90, summary: "No scores" })).toBeNull();
    expect(findFitAssessment({ content: "ordinary assistant prose" })).toBeNull();
  });
});
