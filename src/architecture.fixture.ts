import type { ArchitectureDiagramModel } from "./architecture";

// Dynamically imported only when a development fixture is explicitly enabled.
// This graph is layout QA data, not a claim about a published project.
export const ARCHITECTURE_DEVELOPMENT_FIXTURE: ArchitectureDiagramModel = {
  id: "dev-architecture-layout",
  title: "Development fixture / controlled architecture view",
  description:
    "Layout-only nodes and flows for testing the ArchitectureDiagram component.",
  nodes: [
    { id: "input", label: "Fixture input" },
    { id: "control", label: "Fixture controller" },
    { id: "work", label: "Fixture worker" },
    { id: "review", label: "Fixture review" },
    { id: "telemetry", label: "Fixture telemetry" },
  ],
  edges: [
    { id: "input-control", source: "input", target: "control", label: "Example request" },
    { id: "control-work", source: "control", target: "work" },
    { id: "work-review", source: "work", target: "review", label: "Example output" },
    { id: "work-telemetry", source: "work", target: "telemetry" },
  ],
  evidenceId: "development-fixture-not-evidence",
  developmentFixture: true,
};
