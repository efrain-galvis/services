import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ProjectCard from "../src/ProjectCard";
import ProjectGrid from "../src/ProjectGrid";
import {
  adaptProject,
  adaptProjects,
  filterProjects,
  PROJECT_CARD_DEVELOPMENT_FIXTURE,
  PROJECTS_THIN_STATE,
  PUBLISHED_PROJECTS,
  type Project,
} from "../src/projects";

const project = (override: Partial<Project> = {}): Project => ({
  id: "project",
  name: "Published project",
  technologies: [],
  responsibilities: [],
  productionConsiderations: [],
  measurableResults: [],
  relatedSkills: [],
  ...override,
});

describe("project adapters", () => {
  it("adapts the controlled schema and supports snake-case transport fields", () => {
    expect(adaptProject({
      id: " grounded-project ",
      project_name: " Grounded project ",
      problem: " A documented problem. ",
      role: " Technical lead ",
      architecture: " Published system outline ",
      technologies: [" TypeScript ", "typescript", ""],
      responsibilities: ["Delivery"],
      production_considerations: ["Evaluation gates"],
      measurable_results: ["Published result"],
      confidentiality_level: "anonymized",
      related_skills: ["Production AI"],
      evidence_id: " project.evidence ",
      untrustedMarkup: "<script>not part of the model</script>",
      developmentFixture: true,
    })).toEqual({
      id: "grounded-project",
      name: "Grounded project",
      problem: "A documented problem.",
      role: "Technical lead",
      architecture: "Published system outline",
      technologies: ["TypeScript"],
      responsibilities: ["Delivery"],
      productionConsiderations: ["Evaluation gates"],
      measurableResults: ["Published result"],
      confidentialityLevel: "anonymized",
      relatedSkills: ["Production AI"],
      evidenceId: "project.evidence",
    });
  });

  it("rejects malformed objects and unsupported confidentiality values", () => {
    expect(adaptProject({ id: "missing-name" })).toBeNull();
    expect(adaptProject({
      id: "bad-list",
      name: "Bad list",
      technologies: "TypeScript",
    })).toBeNull();
    expect(adaptProject({
      id: "bad-confidentiality",
      name: "Bad confidentiality",
      confidentialityLevel: "secret",
    })).toBeNull();
  });

  it("drops invalid entries when adapting a generated collection", () => {
    expect(adaptProjects([
      { id: "valid", name: "Valid" },
      { id: "invalid" },
      "not an object",
    ])).toEqual([project({ id: "valid", name: "Valid" })]);
    expect(adaptProjects({ projects: [] })).toEqual([]);
  });
});

describe("project publication and filtering", () => {
  it("ships no inferred project cases and cites the thin knowledge fact", () => {
    expect(PUBLISHED_PROJECTS).toEqual([]);
    expect(PROJECTS_THIN_STATE).toEqual({
      title: "Public project case studies are not yet available.",
      description:
        "This area is intentionally thin. Project names, clients, outcomes, and metrics are not inferred from missing evidence.",
      evidenceId: "proj.public-cases.summary",
    });
  });

  it("filters by related skill or technology without case sensitivity", () => {
    const projects = [
      project({
        id: "agents",
        technologies: ["TypeScript"],
        relatedSkills: ["Agent systems"],
      }),
      project({
        id: "mlops",
        technologies: ["Python"],
        relatedSkills: ["MLOps"],
      }),
    ];

    expect(filterProjects(projects, ["AGENT SYSTEMS"]).map(({ id }) => id))
      .toEqual(["agents"]);
    expect(filterProjects(projects, ["python"]).map(({ id }) => id))
      .toEqual(["mlops"]);
    expect(filterProjects(projects)).not.toBe(projects);
  });
});

describe("project UI safety states", () => {
  it("renders the evidence-cited thin state when no projects are published", () => {
    const html = renderToStaticMarkup(createElement(ProjectGrid));

    expect(html).toContain("Public project case studies are not yet available.");
    expect(html).toContain("proj.public-cases.summary");
    expect(html).not.toContain(PROJECT_CARD_DEVELOPMENT_FIXTURE.name);
  });

  it("redacts every supplied field for confidential projects", () => {
    const html = renderToStaticMarkup(createElement(ProjectCard, {
      project: project({
        name: "Private Client Apollo",
        problem: "Private launch details",
        role: "Private role",
        architecture: "Private architecture",
        technologies: ["Private technology"],
        responsibilities: ["Private responsibility"],
        productionConsiderations: ["Private production detail"],
        measurableResults: ["Private metric: 99%"],
        relatedSkills: ["Private skill"],
        evidenceId: "private.evidence",
        confidentialityLevel: "confidential",
      }),
    }));

    expect(html).toContain("Confidential / redacted");
    expect(html).toContain("Project details are not published.");
    expect(html).not.toContain("Private Client Apollo");
    expect(html).not.toContain("Private launch details");
    expect(html).not.toContain("Private metric");
    expect(html).not.toContain("private.evidence");
  });

  it("labels the development fixture as non-production content", () => {
    const html = renderToStaticMarkup(createElement(ProjectCard, {
      project: PROJECT_CARD_DEVELOPMENT_FIXTURE,
    }));

    expect(html).toContain("Development fixture");
    expect(html).toContain("Layout QA only");
    expect(html).toContain("Explore architecture");
  });

  it("disables Explore architecture with an accessible explanation when no graph exists", () => {
    const html = renderToStaticMarkup(createElement(ProjectCard, {
      project: project(),
    }));

    expect(html).toContain("Explore architecture");
    expect(html).toContain("disabled");
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain(
      "Unavailable until a published architecture graph is linked",
    );
  });

  it("enables Explore architecture for a typed project graph", () => {
    const html = renderToStaticMarkup(createElement(ProjectCard, {
      project: project({
        architectureGraph: {
          id: "graph",
          title: "Published graph",
          nodes: [{ id: "node", label: "Node" }],
          edges: [],
          evidenceId: "project.graph",
        },
      }),
    }));

    expect(html).toContain('aria-disabled="false"');
    expect(html).not.toContain(" disabled");
    expect(html).toContain("Open the published architecture nodes and flows.");
  });
});
