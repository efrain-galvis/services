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
// aligned with app/knowledge/career/timeline.json in site-agent and do not fill
// unpublished gaps by inference.
export const CAREER_TIMELINE_ENTRIES: CareerTimelineEntry[] = [
  {
    id: "career-start-2014",
    dateRange: "From 2014",
    role: "Career in data",
    organizationLabel: "Early career analytics",
    careerLevel: "Not published",
    keyFocus: "Data career foundation",
    technologies: [],
    achievements: ["Career in data began in 2014."],
    tags: ["data"],
    evidenceIds: ["career-start-2014"],
    evidenceStatus: "verified",
  },
  {
    id: "us-enterprise-2021",
    dateRange: "From 2021",
    role: "US enterprise client work",
    organizationLabel: "Enterprise clients",
    careerLevel: "Not published",
    keyFocus: "Enterprise client delivery",
    technologies: [],
    achievements: ["Work with US enterprise clients began in 2021."],
    tags: ["enterprise"],
    evidenceIds: ["us-enterprise-clients-2021"],
    evidenceStatus: "verified",
  },
];

export const CAREER_TIMELINE_FILTERS: CareerTimelineFilter[] = [
  { id: "data", label: "Data foundation" },
  { id: "enterprise", label: "Enterprise work" },
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
