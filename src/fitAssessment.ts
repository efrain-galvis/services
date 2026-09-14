export type FitLabel = "Strong" | "Partial" | "Limited" | "No evidence";
export type FitMatchLevel = "Strong" | "Partial" | "No evidence";

export type FitDimension = {
  name: string;
  score: number;
};

export type FitMatch = {
  requirement: string;
  level: FitMatchLevel;
  evidence_id?: string;
  evidence_text?: string;
  confidence: number;
};

export type FitAssessment = {
  role_title: string;
  overall_score: number;
  label: FitLabel;
  assessment_type: "AI estimate";
  dimensions: FitDimension[];
  matches: FitMatch[];
  gaps: string[];
  summary: string;
};

type UnknownRecord = Record<string, unknown>;

const LABELS = new Set<FitLabel>(["Strong", "Partial", "Limited", "No evidence"]);
const MATCH_LEVELS = new Set<FitMatchLevel>(["Strong", "Partial", "No evidence"]);
const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isScore = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100;
const isConfidence = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
const isText = (value: unknown): value is string => typeof value === "string";

export function adaptFitAssessment(value: unknown): FitAssessment | null {
  if (!isRecord(value)) return null;
  if (
    !isText(value.role_title) ||
    !isScore(value.overall_score) ||
    !isText(value.label) ||
    !LABELS.has(value.label as FitLabel) ||
    value.assessment_type !== "AI estimate" ||
    !Array.isArray(value.dimensions) ||
    !Array.isArray(value.matches) ||
    !Array.isArray(value.gaps) ||
    !isText(value.summary)
  ) {
    return null;
  }

  const dimensions: FitDimension[] = [];
  for (const item of value.dimensions) {
    if (!isRecord(item) || !isText(item.name) || !isScore(item.score)) return null;
    dimensions.push({ name: item.name, score: item.score });
  }

  const matches: FitMatch[] = [];
  for (const item of value.matches) {
    if (
      !isRecord(item) ||
      !isText(item.requirement) ||
      !isText(item.level) ||
      !MATCH_LEVELS.has(item.level as FitMatchLevel) ||
      !isConfidence(item.confidence) ||
      (item.evidence_id !== undefined && !isText(item.evidence_id)) ||
      (item.evidence_text !== undefined && !isText(item.evidence_text))
    ) {
      return null;
    }
    matches.push({
      requirement: item.requirement,
      level: item.level as FitMatchLevel,
      confidence: item.confidence,
      ...(item.evidence_id === undefined ? {} : { evidence_id: item.evidence_id }),
      ...(item.evidence_text === undefined ? {} : { evidence_text: item.evidence_text }),
    });
  }

  if (!value.gaps.every(isText)) return null;

  return {
    role_title: value.role_title,
    overall_score: value.overall_score,
    label: value.label as FitLabel,
    assessment_type: "AI estimate",
    dimensions,
    matches,
    gaps: [...value.gaps],
    summary: value.summary,
  };
}

export const FIT_ASSESSMENT_FIXTURE: FitAssessment = {
  role_title: "Founding AI Product Engineer",
  overall_score: 78,
  label: "Partial",
  assessment_type: "AI estimate",
  dimensions: [
    { name: "Production AI", score: 94 },
    { name: "Product judgment", score: 86 },
    { name: "Team leadership", score: 68 },
    { name: "Domain context", score: 36 },
  ],
  matches: [
    {
      requirement: "Own agent systems from prototype through production",
      level: "Strong",
      evidence_id: "portfolio-production-agents",
      evidence_text: "Built tool-using agents with retrieval, evaluations, and production guardrails.",
      confidence: 0.93,
    },
    {
      requirement: "Lead a growing engineering team",
      level: "Partial",
      evidence_text: "Cross-functional technical leadership is documented; team size is not.",
      confidence: 0.67,
    },
    {
      requirement: "Deep experience in the company’s vertical",
      level: "No evidence",
      confidence: 0.18,
    },
  ],
  gaps: [
    "Direct experience in this company’s vertical is not established.",
    "The expected people-management scope needs validation.",
  ],
  summary:
    "The role aligns with Efrain’s production AI work, while domain depth and management scope need validation.",
};
