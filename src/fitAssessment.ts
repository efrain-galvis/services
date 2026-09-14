export type FitDimension = {
  name: string;
  score: number;
  evidence: string[];
};

export type FitEvidenceItem = {
  title: string;
  evidence: string[];
};

export type FitAssessment = {
  roleTitle: string;
  overallScore: number;
  label: string;
  dimensions: FitDimension[];
  matches: FitEvidenceItem[];
  gaps: FitEvidenceItem[];
  summary: string;
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function score(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(parsed)) return null;
  const percentage = parsed >= 0 && parsed <= 1 ? parsed * 100 : parsed;
  return Math.round(Math.max(0, Math.min(100, percentage)));
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function evidenceList(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (!Array.isArray(value)) return [];
  return value
    .map((item) =>
      typeof item === "string"
        ? item.trim()
        : isRecord(item)
          ? text(item.text) || text(item.evidence) || text(item.detail)
          : "",
    )
    .filter(Boolean);
}

function dimension(value: unknown, index: number): FitDimension | null {
  if (!isRecord(value)) return null;
  const dimensionScore = score(value.score);
  if (dimensionScore === null) return null;
  return {
    name:
      text(value.name) ||
      text(value.category) ||
      text(value.dimension) ||
      `Dimension ${index + 1}`,
    score: dimensionScore,
    evidence: evidenceList(
      value.evidence ?? value.details ?? value.supporting_evidence,
    ),
  };
}

function evidenceItem(value: unknown, index: number, fallback: string): FitEvidenceItem | null {
  if (typeof value === "string") {
    const title = value.trim();
    return title ? { title, evidence: [] } : null;
  }
  if (!isRecord(value)) return null;
  const title =
    text(value.title) ||
    text(value.name) ||
    text(value.dimension) ||
    text(value.category) ||
    `${fallback} ${index + 1}`;
  return {
    title,
    evidence: evidenceList(
      value.evidence ?? value.details ?? value.supporting_evidence ?? value.reason,
    ),
  };
}

export function scoreBand(value: number): "strong" | "partial" | "gap" {
  if (value >= 75) return "strong";
  if (value >= 50) return "partial";
  return "gap";
}

export function fitLabel(value: number): string {
  if (value >= 80) return "Strong fit";
  if (value >= 60) return "Good fit";
  if (value >= 40) return "Partial fit";
  return "Limited fit";
}

export function adaptFitAssessment(value: unknown): FitAssessment | null {
  if (!isRecord(value)) return null;
  const source =
    isRecord(value.fit_assessment) ? value.fit_assessment
      : isRecord(value.assessment) ? value.assessment
        : value;
  const overallScore = score(source.overall_score ?? source.overallScore);
  if (overallScore === null || !Array.isArray(source.dimensions)) return null;

  const dimensions = source.dimensions
    .map(dimension)
    .filter((item): item is FitDimension => item !== null);
  if (!dimensions.length) return null;

  const mapItems = (items: unknown, fallback: string) =>
    Array.isArray(items)
      ? items
          .map((item, index) => evidenceItem(item, index, fallback))
          .filter((item): item is FitEvidenceItem => item !== null)
      : [];

  return {
    roleTitle:
      text(source.role_title) || text(source.roleTitle) || "Opportunity fit",
    overallScore,
    label: text(source.label) || fitLabel(overallScore),
    dimensions,
    matches: mapItems(source.matches, "Match"),
    gaps: mapItems(source.gaps, "Gap"),
    summary: text(source.summary),
  };
}

function parsedJson(value: string): unknown {
  const candidate = value.trim();
  if (!candidate.startsWith("{") && !candidate.startsWith("[")) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

export function findFitAssessment(value: unknown): FitAssessment | null {
  const seen = new Set<object>();
  const visit = (candidate: unknown, depth: number): FitAssessment | null => {
    if (depth > 8) return null;
    if (typeof candidate === "string") {
      const parsed = parsedJson(candidate);
      return parsed === null ? null : visit(parsed, depth + 1);
    }
    if (typeof candidate !== "object" || candidate === null) return null;
    if (seen.has(candidate)) return null;
    seen.add(candidate);

    const direct = adaptFitAssessment(candidate);
    if (direct) return direct;
    const values = Array.isArray(candidate)
      ? candidate
      : Object.values(candidate as UnknownRecord);
    for (const nested of values) {
      const result = visit(nested, depth + 1);
      if (result) return result;
    }
    return null;
  };
  return visit(value, 0);
}

export const FIT_ASSESSMENT_FIXTURE: FitAssessment = {
  roleTitle: "Founding AI Product Engineer",
  overallScore: 82,
  label: "Strong fit",
  dimensions: [
    {
      name: "Production AI",
      score: 94,
      evidence: [
        "Built and operated tool-using agents with retrieval, memory, and evaluation loops.",
        "Experience moving prototypes through observability and production hardening.",
      ],
    },
    {
      name: "Product judgment",
      score: 86,
      evidence: ["Led product framing, architecture tradeoffs, and launch readiness reviews."],
    },
    {
      name: "Team leadership",
      score: 72,
      evidence: ["Cross-functional technical leadership is documented; team-size evidence is limited."],
    },
    {
      name: "Domain context",
      score: 48,
      evidence: [],
    },
  ],
  matches: [
    {
      title: "Agent systems from prototype to production",
      evidence: ["Tool design, retrieval, memory, evaluations, guardrails, and operations."],
    },
    {
      title: "Technical product leadership",
      evidence: ["Connects product decisions to architecture, risk, and measurable quality."],
    },
  ],
  gaps: [
    {
      title: "Direct domain experience",
      evidence: ["Available evidence does not establish experience in this company’s vertical."],
    },
  ],
  summary:
    "The role aligns strongly with Efrain’s production AI and product-systems work. Validate domain depth and the expected people-management scope in a conversation.",
};
