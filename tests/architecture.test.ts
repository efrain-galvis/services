import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ArchitectureDiagram from "../src/ArchitectureDiagram";
import {
  adaptArchitectureDiagram,
  ARCHITECTURE_THIN_STATE,
  type ArchitectureDiagramModel,
} from "../src/architecture";

const diagram: ArchitectureDiagramModel = {
  id: "published-graph",
  title: "Published architecture",
  description: "A documented system flow.",
  nodes: [
    { id: "input", label: "Input", evidenceId: "node.input" },
    { id: "output", label: "Output" },
  ],
  edges: [
    {
      id: "input-output",
      source: "input",
      target: "output",
      label: "Validated flow",
    },
  ],
  evidenceId: "project.graph",
};

describe("architecture adapter", () => {
  it("adapts only typed nodes and valid flows", () => {
    expect(adaptArchitectureDiagram({
      id: " graph ",
      title: " Grounded graph ",
      description: " Published description ",
      nodes: [
        { id: "source", label: " Source ", evidence_id: " node.source " },
        { id: "target", label: "Target" },
      ],
      edges: [
        { source: "source", target: "target", label: " Flow " },
      ],
      evidence_id: " graph.evidence ",
      html: "<script>not part of the model</script>",
    })).toEqual({
      id: "graph",
      title: "Grounded graph",
      description: "Published description",
      nodes: [
        { id: "source", label: "Source", evidenceId: "node.source" },
        { id: "target", label: "Target" },
      ],
      edges: [
        {
          id: "source-target-1",
          source: "source",
          target: "target",
          label: "Flow",
        },
      ],
      evidenceId: "graph.evidence",
    });
  });

  it("fails closed for duplicate nodes, malformed fields, and dangling edges", () => {
    expect(adaptArchitectureDiagram({
      id: "duplicate",
      title: "Duplicate",
      nodes: [
        { id: "same", label: "One" },
        { id: "same", label: "Two" },
      ],
      edges: [],
    })).toBeNull();
    expect(adaptArchitectureDiagram({
      id: "dangling",
      title: "Dangling",
      nodes: [{ id: "source", label: "Source" }],
      edges: [{ source: "source", target: "missing" }],
    })).toBeNull();
    expect(adaptArchitectureDiagram({
      id: "bad-label",
      title: "Bad label",
      nodes: [{ id: "source", label: { html: "No" } }],
      edges: [],
    })).toBeNull();
    expect(adaptArchitectureDiagram({
      id: "self-loop",
      title: "Self loop",
      nodes: [{ id: "source", label: "Source" }],
      edges: [{ source: "source", target: "source" }],
    })).toBeNull();
  });
});

describe("ArchitectureDiagram", () => {
  it("renders the evidence-cited thin state by default", () => {
    const html = renderToStaticMarkup(createElement(ArchitectureDiagram));
    expect(html).toContain(ARCHITECTURE_THIN_STATE.title);
    expect(html).toContain("proj.public-cases.summary");
    expect(html).not.toContain("<svg");
  });

  it("renders controlled props as SVG plus a keyboard-focusable list", () => {
    const html = renderToStaticMarkup(
      createElement(ArchitectureDiagram, { diagram }),
    );
    expect(html).toContain("Published architecture");
    expect(html).toContain("<svg");
    expect(html).toContain("Validated flow");
    expect(html).toContain("Architecture nodes and flows");
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("node.input");
    expect(html).toContain("project.graph");
  });

  it("wraps and truncates long SVG labels while preserving the full list label", () => {
    const longLabel =
      "A deliberately long architecture node label that cannot fit in one box";
    const html = renderToStaticMarkup(
      createElement(ArchitectureDiagram, {
        diagram: {
          ...diagram,
          nodes: [{ id: "long", label: longLabel }],
          edges: [],
        },
      }),
    );

    expect(html).toContain("<tspan");
    expect(html).toContain('textLength="166"');
    expect(html).toContain("…</tspan>");
    expect(html).toContain(`<strong>${longLabel}</strong>`);
  });

  it("fails closed for empty or dangling hand-authored diagrams", () => {
    const emptyHtml = renderToStaticMarkup(
      createElement(ArchitectureDiagram, {
        diagram: { ...diagram, nodes: [], edges: [] },
      }),
    );
    const danglingHtml = renderToStaticMarkup(
      createElement(ArchitectureDiagram, {
        diagram: {
          ...diagram,
          nodes: [{ id: "source", label: "Source" }],
          edges: [{ id: "dangling", source: "source", target: "missing" }],
        },
      }),
    );

    expect(emptyHtml).toContain(ARCHITECTURE_THIN_STATE.title);
    expect(emptyHtml).not.toContain("<svg");
    expect(emptyHtml).not.toContain("NaN");
    expect(danglingHtml).toContain(ARCHITECTURE_THIN_STATE.title);
    expect(danglingHtml).not.toContain("<svg");
  });

  it("intersects vertically aligned edges with node boundaries", () => {
    const nodes = Array.from({ length: 6 }, (_, index) => ({
      id: `node-${index}`,
      label: `Node ${index}`,
    }));
    const html = renderToStaticMarkup(
      createElement(ArchitectureDiagram, {
        diagram: {
          ...diagram,
          nodes,
          edges: [
            {
              id: "vertical",
              source: "node-0",
              target: "node-3",
              label: "Vertical flow",
            },
          ],
        },
      }),
    );

    expect(html).toContain(
      '<line x1="150" y1="101" x2="150" y2="149"',
    );
  });
});
