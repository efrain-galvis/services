import { describe, expect, it } from "vitest";
import {
  adaptFitAssessment,
} from "../src/fitAssessment";

describe("fit assessment adapter", () => {
  it("preserves the exact site-agent schema", () => {
    const payload = {
      role_title: "AI Lead",
      overall_score: 82,
      label: "Partial",
      assessment_type: "AI estimate",
      dimensions: [{ name: "Systems", score: 90 }],
      matches: [{
        requirement: "Production ownership",
        level: "No evidence",
        evidence_id: "work-17",
        evidence_text: "The available artifact is indirect.",
        confidence: 0.31,
      }],
      gaps: ["Industry depth is not established"],
      summary: "A strong match.",
    };

    expect(adaptFitAssessment(payload)).toEqual({
      role_title: "AI Lead",
      overall_score: 82,
      label: "Partial",
      assessment_type: "AI estimate",
      dimensions: [{ name: "Systems", score: 90 }],
      matches: [{
        requirement: "Production ownership",
        level: "No evidence",
        evidence_id: "work-17",
        evidence_text: "The available artifact is indirect.",
        confidence: 0.31,
      }],
      gaps: ["Industry depth is not established"],
      summary: "A strong match.",
    });
  });

  it.each([
    ["invented label", { label: "Good" }],
    ["invented match level", { matches: [{ requirement: "Build", level: "Limited", confidence: 0.5 }] }],
    ["fractional overall score", { overall_score: 0.82 }],
    ["out-of-range confidence", { matches: [{ requirement: "Build", level: "Strong", confidence: 82 }] }],
  ])("rejects %s", (_name, override) => {
    expect(adaptFitAssessment({
      role_title: "AI Lead",
      overall_score: 82,
      label: "Strong",
      assessment_type: "AI estimate",
      dimensions: [{ name: "Systems", score: 90 }],
      matches: [],
      gaps: [],
      summary: "",
      ...override,
    })).toBeNull();
  });
});
