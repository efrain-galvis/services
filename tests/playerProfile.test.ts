import { describe, expect, it } from "vitest";
import {
  BASELINE_SKILL_PROFILE,
  createPlayerProfile,
} from "../src/playerProfile";

describe("player profile adapter", () => {
  it("uses the labeled baseline profile by default", () => {
    const profile = createPlayerProfile();

    expect(profile.mode).toBe("baseline");
    expect(profile.modeLabel).toBe("Baseline skill profile");
    expect(profile.dimensions.map(({ name }) => name)).toEqual([
      "Agentic Systems",
      "LLM Engineering",
      "Production AI",
      "Evaluation & Observability",
      "MLOps & Infrastructure",
      "System Design",
    ]);
  });

  it("maps Fit dimensions into a labeled role-relative profile", () => {
    const fitDimensions = [
      { name: "Production ownership", score: 91 },
      { name: "Domain context", score: 42 },
      { name: "Technical leadership", score: 76 },
    ];
    const profile = createPlayerProfile({
      fitDimensions,
      fitOverallScore: 73,
      fitRoleTitle: "AI Platform Lead",
    });

    expect(profile).toMatchObject({
      mode: "role-relative",
      modeLabel: "Role-relative profile",
      overallScore: 73,
      context: "AI Platform Lead",
      dimensions: fitDimensions,
    });
    expect(profile.dimensions).not.toBe(fitDimensions);
  });

  it("does not claim role-relative mode without Fit dimensions", () => {
    expect(createPlayerProfile({
      fitDimensions: [],
      fitOverallScore: 99,
      fitRoleTitle: "Un-grounded role",
    })).toBe(BASELINE_SKILL_PROFILE);
  });

  it("derives a directional overall score when Fit omits one", () => {
    const profile = createPlayerProfile({
      fitDimensions: [
        { name: "Systems", score: 80 },
        { name: "Leadership", score: 61 },
        { name: "Domain", score: 40 },
      ],
    });

    expect(profile.overallScore).toBe(60);
  });
});
