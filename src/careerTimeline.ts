export type CareerTimelineEntry = {
  id: string;
  dateRange: string;
  role: string;
  organizationLabel: string;
  careerLevel: string;
  keyFocus: string;
  technologies: string[];
  achievements: string[];
  tags: string[];
  evidenceIds: string[];
  evidenceStatus: "verified" | "directional";
};

export type CareerTimelineFilter = {
  id: string;
  label: string;
};

export type CareerTimelineViewEntry = CareerTimelineEntry & {
  highlighted: boolean;
};

// These are milestones, not a complete employment history. Keep this module
// aligned with published site-agent knowledge and do not fill unpublished gaps
// by inference.
export const CAREER_TIMELINE_ENTRIES: CareerTimelineEntry[] = [
  {
    id: "career-start-2014",
    dateRange: "2014–Present",
    role: "Analyst / data foundation",
    organizationLabel: "Early career analytics",
    careerLevel: "Not published",
    keyFocus: "Data analysis and AI foundations",
    technologies: [],
    achievements: [
      "Analyst career began in 2014.",
      "10+ years of published data and AI experience.",
    ],
    tags: ["data"],
    evidenceIds: ["exp.data-ai.since-2014"],
    evidenceStatus: "verified",
  },
  {
    id: "ml-ai-engineering-era",
    dateRange: "~2019–Present",
    role: "ML / AI engineering",
    organizationLabel: "Organization not published",
    careerLevel: "Not published",
    keyFocus: "Machine learning and AI systems",
    technologies: [],
    achievements: ["7+ years of ML / AI engineering experience."],
    tags: ["ml-ai"],
    evidenceIds: ["exp.ml-ai.seven-plus-years"],
    evidenceStatus: "directional",
  },
  {
    id: "us-enterprise-2021",
    dateRange: "2021–Present",
    role: "US enterprise client work",
    organizationLabel: "US enterprise clients",
    careerLevel: "Not published",
    keyFocus: "Production delivery for enterprise contexts",
    technologies: [],
    achievements: ["Work with US enterprise clients began in 2021."],
    tags: ["enterprise"],
    evidenceIds: ["exp.us-enterprise.since-2021"],
    evidenceStatus: "verified",
  },
  {
    id: "genai-agentic-era",
    dateRange: "~2023–Present",
    role: "Production GenAI / agentic systems",
    organizationLabel: "Organization not published",
    careerLevel: "Not published",
    keyFocus: "Generative AI and agentic systems in production",
    technologies: [],
    achievements: ["3+ years of production GenAI and agentic experience."],
    tags: ["genai", "ml-ai"],
    evidenceIds: ["exp.genai.three-plus-years"],
    evidenceStatus: "directional",
  },
  {
    id: "independent-ai-architect",
    dateRange: "Present",
    role: "Independent AI Architect",
    organizationLabel: "Independent practice",
    careerLevel: "Not published",
    keyFocus: "Production AI systems and technical direction",
    technologies: [],
    achievements: [
      "Current practice spans ML / AI engineering and production agentic systems.",
    ],
    tags: ["independent", "genai", "ml-ai"],
    evidenceIds: [],
    evidenceStatus: "directional",
  },
];

export const CAREER_TIMELINE_FILTERS: CareerTimelineFilter[] = [
  { id: "data", label: "Data foundation" },
  { id: "ml-ai", label: "ML / AI" },
  { id: "enterprise", label: "US enterprise" },
  { id: "genai", label: "GenAI / agents" },
  { id: "independent", label: "Independent" },
];

function normalized(values: string[]) {
  return new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean));
}

export function filterCareerTimeline(
  entries: CareerTimelineEntry[],
  filters: string[] = [],
): CareerTimelineEntry[] {
  const activeFilters = normalized(filters);
  if (!activeFilters.size) return [...entries];

  return entries.filter((entry) =>
    entry.tags.some((tag) => activeFilters.has(tag.toLowerCase())),
  );
}

export function isCareerEntryHighlighted(
  entry: CareerTimelineEntry,
  highlightEvidenceIds: string[] = [],
): boolean {
  const highlights = normalized(highlightEvidenceIds);
  return entry.evidenceIds.some((id) => highlights.has(id.toLowerCase()));
}

export function createCareerTimelineView(
  entries: CareerTimelineEntry[],
  filters: string[] = [],
  highlightEvidenceIds: string[] = [],
): CareerTimelineViewEntry[] {
  return filterCareerTimeline(entries, filters).map((entry) => ({
    ...entry,
    highlighted: isCareerEntryHighlighted(entry, highlightEvidenceIds),
  }));
}

export function getCareerTimelineStatus({
  evidenceStatus,
  highlighted,
}: Pick<CareerTimelineViewEntry, "evidenceStatus" | "highlighted">): string {
  const status =
    evidenceStatus === "directional" ? "Directional era" : "Verified fact";
  return highlighted ? `${status} · Relevant evidence` : status;
}
