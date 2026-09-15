export type ArchitectureNode = {
  id: string;
  label: string;
  evidenceId?: string;
};

export type ArchitectureEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  evidenceId?: string;
};

export type ArchitectureDiagramModel = {
  id: string;
  title: string;
  description?: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  evidenceId?: string;
  developmentFixture?: boolean;
};

export type ArchitectureThinState = {
  title: string;
  description: string;
  evidenceId: "proj.public-cases.summary";
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function read(record: UnknownRecord, camelCase: string, snakeCase: string) {
  return record[camelCase] ?? record[snakeCase];
}

function requiredText(value: unknown, maxLength = 160): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= maxLength ? text : null;
}

function optionalText(
  value: unknown,
  maxLength = 160,
): string | null | undefined {
  if (value === undefined || value === null) return undefined;
  return requiredText(value, maxLength);
}

function adaptNode(value: unknown): ArchitectureNode | null {
  if (!isRecord(value)) return null;
  const id = requiredText(value.id);
  const label = requiredText(value.label);
  const evidenceId = optionalText(read(value, "evidenceId", "evidence_id"));
  if (!id || !label || evidenceId === null) return null;
  return { id, label, ...(evidenceId ? { evidenceId } : {}) };
}

function adaptEdge(value: unknown, index: number): ArchitectureEdge | null {
  if (!isRecord(value)) return null;
  const source = requiredText(value.source);
  const target = requiredText(value.target);
  const suppliedId = optionalText(value.id);
  const label = optionalText(value.label);
  const evidenceId = optionalText(read(value, "evidenceId", "evidence_id"));
  if (!source || !target || suppliedId === null || label === null || evidenceId === null) {
    return null;
  }
  return {
    id: suppliedId ?? `${source}-${target}-${index + 1}`,
    source,
    target,
    ...(label ? { label } : {}),
    ...(evidenceId ? { evidenceId } : {}),
  };
}

export function adaptArchitectureDiagram(
  value: unknown,
): ArchitectureDiagramModel | null {
  if (!isRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    return null;
  }

  const id = requiredText(value.id);
  const title = requiredText(value.title);
  const description = optionalText(value.description, 500);
  const evidenceId = optionalText(read(value, "evidenceId", "evidence_id"));
  const nodes = value.nodes.map(adaptNode);
  const edges = value.edges.map(adaptEdge);

  if (
    !id ||
    !title ||
    description === null ||
    evidenceId === null ||
    nodes.some((node) => node === null) ||
    edges.some((edge) => edge === null)
  ) {
    return null;
  }

  const safeNodes = nodes as ArchitectureNode[];
  const safeEdges = edges as ArchitectureEdge[];
  if (safeNodes.length > 24 || safeEdges.length > 48) return null;
  const nodeIds = new Set(safeNodes.map((node) => node.id));
  const edgeIds = new Set(safeEdges.map((edge) => edge.id));
  if (
    safeNodes.length === 0 ||
    nodeIds.size !== safeNodes.length ||
    edgeIds.size !== safeEdges.length ||
    safeEdges.some((edge) => !nodeIds.has(edge.source) || !nodeIds.has(edge.target))
  ) {
    return null;
  }

  return {
    id,
    title,
    nodes: safeNodes,
    edges: safeEdges,
    ...(description ? { description } : {}),
    ...(evidenceId ? { evidenceId } : {}),
  };
}

// No public architecture graph is currently supported by the project evidence.
export const ARCHITECTURE_THIN_STATE: ArchitectureThinState = {
  title: "No published architecture view is available.",
  description:
    "Architecture views require published project evidence. LYRA does not infer system nodes, flows, or client details from thin knowledge.",
  evidenceId: "proj.public-cases.summary",
};
