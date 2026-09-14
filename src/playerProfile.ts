import type { FitDimension } from "./fitAssessment";

export type PlayerProfileMode = "baseline" | "role-relative";

export type PlayerDimension = {
  name: string;
  score: number;
};

export type PlayerProfile = {
  name: string;
  title: string;
  overallScore: number;
  dimensions: PlayerDimension[];
  mode: PlayerProfileMode;
  modeLabel: "Baseline skill profile" | "Role-relative profile";
  context?: string;
};

// Editorial starting point based on the portfolio represented on this site.
// These directional scores are intentionally conservative and can be tuned as
// Efrain's source material evolves; they are not an independent credential.
export const BASELINE_SKILL_PROFILE: PlayerProfile = {
  name: "Efrain Galvis",
  title: "Applied AI Engineer / AI Architect",
  overallScore: 86,
  mode: "baseline",
  modeLabel: "Baseline skill profile",
  dimensions: [
    { name: "Agentic Systems", score: 89 },
    { name: "LLM Engineering", score: 87 },
    { name: "Production AI", score: 90 },
    { name: "Evaluation & Observability", score: 84 },
    { name: "MLOps & Infrastructure", score: 81 },
    { name: "System Design", score: 87 },
  ],
};

export type PlayerProfileInput = {
  fitDimensions?: FitDimension[];
  fitOverallScore?: number;
  fitRoleTitle?: string;
};

export function createPlayerProfile({
  fitDimensions,
  fitOverallScore,
  fitRoleTitle,
}: PlayerProfileInput = {}): PlayerProfile {
  if (!fitDimensions?.length) return BASELINE_SKILL_PROFILE;

  const overallScore =
    typeof fitOverallScore === "number" &&
    Number.isInteger(fitOverallScore) &&
    fitOverallScore >= 0 &&
    fitOverallScore <= 100
      ? fitOverallScore
      : Math.round(
          fitDimensions.reduce((total, dimension) => total + dimension.score, 0) /
            fitDimensions.length,
        );
  const roleTitle = fitRoleTitle?.trim();

  return {
    name: BASELINE_SKILL_PROFILE.name,
    title: BASELINE_SKILL_PROFILE.title,
    overallScore,
    mode: "role-relative",
    modeLabel: "Role-relative profile",
    dimensions: fitDimensions.map(({ name, score }) => ({ name, score })),
    ...(roleTitle ? { context: roleTitle } : {}),
  };
}
