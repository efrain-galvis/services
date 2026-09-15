import { useId } from "react";
import {
  ARCHITECTURE_THIN_STATE,
  type ArchitectureDiagramModel,
  type ArchitectureThinState,
} from "./architecture";

export type ArchitectureDiagramProps = {
  diagram?: ArchitectureDiagramModel | null;
  thinState?: ArchitectureThinState;
  onClose?: () => void;
};

type Point = { x: number; y: number };

const VIEWBOX_WIDTH = 900;
const NODE_WIDTH = 190;
const NODE_HEIGHT = 82;
const NODE_LABEL_LINE_LENGTH = 16;
const NODE_TEXT_WIDTH = NODE_WIDTH - 24;

function wrapNodeLabel(label: string): string[] {
  const characters = Array.from(label.trim());
  if (characters.length <= NODE_LABEL_LINE_LENGTH) return [characters.join("")];

  let splitAt = -1;
  for (let index = 0; index < NODE_LABEL_LINE_LENGTH; index += 1) {
    if (/\s/.test(characters[index])) splitAt = index;
  }
  if (splitAt < NODE_LABEL_LINE_LENGTH / 2) splitAt = NODE_LABEL_LINE_LENGTH;

  const firstLine = characters.slice(0, splitAt).join("").trimEnd();
  const remainder = characters.slice(
    splitAt < NODE_LABEL_LINE_LENGTH ? splitAt + 1 : splitAt,
  );
  const secondLine =
    remainder.length > NODE_LABEL_LINE_LENGTH
      ? `${remainder.slice(0, NODE_LABEL_LINE_LENGTH - 1).join("").trimEnd()}…`
      : remainder.join("").trim();

  return [firstLine, secondLine];
}

function layoutNodes(diagram: ArchitectureDiagramModel) {
  const columns = Math.min(3, diagram.nodes.length);
  const rows = Math.ceil(diagram.nodes.length / columns);
  const xGap = VIEWBOX_WIDTH / columns;
  const yGap = 130;
  const positions = new Map<string, Point>();

  diagram.nodes.forEach((node, index) => {
    const row = Math.floor(index / columns);
    const itemsInRow =
      row === rows - 1 ? diagram.nodes.length - row * columns : columns;
    const column = index - row * columns;
    const rowWidth = itemsInRow * xGap;
    positions.set(node.id, {
      x: (VIEWBOX_WIDTH - rowWidth) / 2 + column * xGap + xGap / 2,
      y: 60 + row * yGap,
    });
  });

  return { height: 120 + (rows - 1) * yGap, positions };
}

export default function ArchitectureDiagram({
  diagram,
  thinState = ARCHITECTURE_THIN_STATE,
  onClose,
}: ArchitectureDiagramProps) {
  const titleId = useId();
  const descriptionId = useId();
  const markerId = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  if (!diagram) {
    return (
      <section className="arch-shell" aria-labelledby={titleId}>
        <header className="arch-header">
          <div>
            <p className="arch-kicker">LYRA / architecture</p>
            <h2 id={titleId}>Controlled architecture view</h2>
          </div>
          {onClose ? (
            <button
              className="fit-close"
              type="button"
              onClick={onClose}
              aria-label="Close architecture view"
            >
              ×
            </button>
          ) : null}
        </header>
        <div className="arch-thin-state" role="status">
          <span>Thin public evidence</span>
          <h3>{thinState.title}</h3>
          <p>{thinState.description}</p>
          <small>Evidence / {thinState.evidenceId}</small>
        </div>
        <footer className="arch-footer">
          <p>Only typed nodes and flows from published evidence can appear here.</p>
          <span>Grounded / FR-014</span>
        </footer>
      </section>
    );
  }

  const { height, positions } = layoutNodes(diagram);

  return (
    <section className="arch-shell" aria-labelledby={titleId}>
      <header className="arch-header">
        <div>
          <p className="arch-kicker">LYRA / architecture</p>
          <h2 id={titleId}>{diagram.title}</h2>
          {diagram.description ? (
            <p id={descriptionId}>{diagram.description}</p>
          ) : null}
        </div>
        {onClose ? (
          <button
            className="fit-close"
            type="button"
            onClick={onClose}
            aria-label="Close architecture view"
          >
            ×
          </button>
        ) : null}
      </header>

      {diagram.developmentFixture ? (
        <p className="arch-fixture-warning">
          Development fixture / layout QA only — not published architecture evidence.
        </p>
      ) : null}

      <div className="arch-canvas">
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${height}`}
        >
          <defs>
            <marker
              id={markerId}
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path className="arch-arrow" d="M0,0 L8,4 L0,8 Z" />
            </marker>
          </defs>
          <g className="arch-edges">
            {diagram.edges.map((edge) => {
              const source = positions.get(edge.source)!;
              const target = positions.get(edge.target)!;
              const direction = target.x >= source.x ? 1 : -1;
              const x1 = source.x + direction * (NODE_WIDTH / 2);
              const x2 = target.x - direction * (NODE_WIDTH / 2);
              const y1 = source.y;
              const y2 = target.y;
              return (
                <g key={edge.id}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    markerEnd={`url(#${markerId})`}
                  />
                  {edge.label ? (
                    <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8}>
                      {edge.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </g>
          <g className="arch-nodes">
            {diagram.nodes.map((node, index) => {
              const point = positions.get(node.id)!;
              const labelLines = wrapNodeLabel(node.label);
              return (
                <g key={node.id}>
                  <rect
                    x={point.x - NODE_WIDTH / 2}
                    y={point.y - NODE_HEIGHT / 2}
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    rx="10"
                  />
                  <text
                    className="arch-node-label"
                    x={point.x}
                    y={point.y - (labelLines.length > 1 ? 13 : 6)}
                  >
                    {labelLines.map((line, lineIndex) => (
                      <tspan
                        x={point.x}
                        dy={lineIndex === 0 ? 0 : 18}
                        key={`${node.id}-line-${lineIndex}`}
                        lengthAdjust="spacingAndGlyphs"
                        textLength={
                          line.length > 12 ? NODE_TEXT_WIDTH : undefined
                        }
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                  <text className="arch-node-index" x={point.x} y={point.y + 29}>
                    Node {String(index + 1).padStart(2, "0")}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="arch-alternative">
        <h3>Architecture nodes and flows</h3>
        <ol aria-describedby={diagram.description ? descriptionId : undefined}>
          {diagram.nodes.map((node) => (
            <li key={node.id} tabIndex={0}>
              <strong>{node.label}</strong>
              <span>
                {diagram.edges
                  .filter((edge) => edge.source === node.id)
                  .map((edge) => {
                    const target = diagram.nodes.find(
                      (candidate) => candidate.id === edge.target,
                    )!;
                    return `${edge.label ? `${edge.label} to ` : "Flows to "}${target.label}`;
                  })
                  .join(" · ") || "No outgoing flow"}
              </span>
              {node.evidenceId ? <small>Evidence / {node.evidenceId}</small> : null}
            </li>
          ))}
        </ol>
      </div>

      <footer className="arch-footer">
        <p>
          {diagram.evidenceId
            ? `Evidence / ${diagram.evidenceId}`
            : "No diagram-level evidence ID supplied"}
        </p>
        <span>{diagram.developmentFixture ? "Fixture / not evidence" : "Grounded / FR-014"}</span>
      </footer>
    </section>
  );
}
