import {
  adaptArchitectureDiagram,
  type ArchitectureDiagramModel,
} from "./architecture";

export type ProjectConfidentiality =
  | "public"
  | "anonymized"
  | "confidential";

export type Project = {
  id: string;
  name: string;
  problem?: string;
  role?: string;
  architecture?: string;
  technologies: string[];
  responsibilities: string[];
  productionConsiderations: string[];
  measurableResults: string[];
  confidentialityLevel?: ProjectConfidentiality;
  relatedSkills: string[];
  evidenceId?: string;
  developmentFixture?: boolean;
  architectureGraph?: ArchitectureDiagramModel;
};

export type ProjectsThinState = {
  title: string;
  description: string;
  evidenceId: "proj.public-cases.summary";
};

type UnknownRecord = Record<string, unknown>;

const CONFIDENTIALITY_LEVELS = new Set<ProjectConfidentiality>([
  "public",
  "anonymized",
  "confidential",
]);

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function optionalText(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return null;
  return value.trim() || undefined;
}

function textList(value: unknown): string[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return null;
  }

  return value.reduce<string[]>((items, item) => {
    const trimmed = item.trim();
    if (trimmed && !items.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
      items.push(trimmed);
    }
    return items;
  }, []);
}

function read(record: UnknownRecord, camelCase: string, snakeCase: string) {
  return record[camelCase] ?? record[snakeCase];
}

export function adaptProject(value: unknown): Project | null {
  if (!isRecord(value)) return null;

  const id = optionalText(value.id);
  const name = optionalText(read(value, "name", "project_name"));
  const problem = optionalText(value.problem);
  const role = optionalText(value.role);
  const architecture = optionalText(value.architecture);
  const architectureGraphValue = read(
    value,
    "architectureGraph",
    "architecture_graph",
  );
  const architectureGraph =
    architectureGraphValue === undefined || architectureGraphValue === null
      ? undefined
      : adaptArchitectureDiagram(architectureGraphValue);
  const evidenceId = optionalText(read(value, "evidenceId", "evidence_id"));
  const confidentiality = optionalText(
    read(value, "confidentialityLevel", "confidentiality_level"),
  );
  const technologies = textList(value.technologies);
  const responsibilities = textList(value.responsibilities);
  const productionConsiderations = textList(
    read(value, "productionConsiderations", "production_considerations"),
  );
  const measurableResults = textList(
    read(value, "measurableResults", "measurable_results"),
  );
  const relatedSkills = textList(read(value, "relatedSkills", "related_skills"));

  if (
    !id ||
    !name ||
    id === null ||
    name === null ||
    problem === null ||
    role === null ||
    architecture === null ||
    architectureGraph === null ||
    evidenceId === null ||
    confidentiality === null ||
    technologies === null ||
    responsibilities === null ||
    productionConsiderations === null ||
    measurableResults === null ||
    relatedSkills === null ||
    (confidentiality !== undefined &&
      !CONFIDENTIALITY_LEVELS.has(confidentiality as ProjectConfidentiality))
  ) {
    return null;
  }

  return {
    id,
    name,
    technologies,
    responsibilities,
    productionConsiderations,
    measurableResults,
    relatedSkills,
    ...(problem ? { problem } : {}),
    ...(role ? { role } : {}),
    ...(architecture ? { architecture } : {}),
    ...(architectureGraph ? { architectureGraph } : {}),
    ...(confidentiality
      ? { confidentialityLevel: confidentiality as ProjectConfidentiality }
      : {}),
    ...(evidenceId ? { evidenceId } : {}),
  };
}

export function adaptProjects(value: unknown): Project[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(adaptProject)
    .filter((project): project is Project => project !== null);
}

function normalized(values: string[]) {
  return new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean));
}

export function filterProjects(
  projects: Project[],
  skillFilters: string[] = [],
): Project[] {
  const activeFilters = normalized(skillFilters);
  if (!activeFilters.size) return [...projects];

  return projects.filter((project) =>
    [...project.relatedSkills, ...project.technologies].some((value) =>
      activeFilters.has(value.toLowerCase()),
    ),
  );
}

export function getProjectFilters(projects: Project[]): string[] {
  const filters = new Map<string, string>();

  for (const project of projects) {
    for (const value of [...project.relatedSkills, ...project.technologies]) {
      const trimmed = value.trim();
      const key = trimmed.toLowerCase();
      if (key && !filters.has(key)) filters.set(key, trimmed);
    }
  }

  return [...filters.values()].sort((left, right) => left.localeCompare(right));
}

// The public knowledge source currently contains no publishable project case
// studies. Keep the production collection empty until that source changes.
export const PUBLISHED_PROJECTS: Project[] = [];

export const PROJECTS_THIN_STATE: ProjectsThinState = {
  title: "Public project case studies are not yet available.",
  description:
    "This area is intentionally thin. Project names, clients, outcomes, and metrics are not inferred from missing evidence.",
  evidenceId: "proj.public-cases.summary",
};

// Development-only layout content. This must never be presented as portfolio
// evidence or added to PUBLISHED_PROJECTS.
export const PROJECT_CARD_DEVELOPMENT_FIXTURE: Project = {
  id: "dev-project-card-layout",
  name: "Development fixture / production agent platform",
  problem:
    "Layout-only sample problem statement used to exercise a complete project card.",
  role: "Fixture role / not a portfolio claim",
  architecture:
    "Example orchestration, retrieval, evaluation, and observability layers.",
  technologies: ["TypeScript", "React", "Example LLM API"],
  responsibilities: [
    "Exercise long responsibility labels and multi-item lists.",
    "Verify responsive card composition.",
  ],
  productionConsiderations: [
    "Example latency and cost controls.",
    "Example safety and evaluation gates.",
  ],
  measurableResults: [
    "No publishable result — development fixture only.",
  ],
  confidentialityLevel: "anonymized",
  relatedSkills: ["Agent systems", "Production AI", "Evaluation"],
  evidenceId: "development-fixture-not-evidence",
  developmentFixture: true,
};
