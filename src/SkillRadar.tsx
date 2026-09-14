import type { PlayerDimension } from "./playerProfile";

type Props = {
  dimensions: PlayerDimension[];
};

type Point = {
  x: number;
  y: number;
};

const CENTER = 160;
const RADIUS = 112;

function point(index: number, count: number, scale = 1): Point {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
  return {
    x: CENTER + Math.cos(angle) * RADIUS * scale,
    y: CENTER + Math.sin(angle) * RADIUS * scale,
  };
}

function pointsAttribute(points: Point[]) {
  return points.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
}

export default function SkillRadar({ dimensions }: Props) {
  const count = dimensions.length;
  if (count < 3) return null;

  const rings = [0.25, 0.5, 0.75, 1].map((scale) =>
    pointsAttribute(dimensions.map((_, index) => point(index, count, scale))),
  );
  const values = dimensions.map((dimension, index) =>
    point(index, count, Math.min(100, Math.max(0, dimension.score)) / 100),
  );
  const summary = dimensions
    .map((dimension) => `${dimension.name} ${dimension.score} percent`)
    .join(", ");

  return (
    <div
      className="radar-chart"
      role="img"
      aria-label={`Skill radar: ${summary}`}
    >
      <svg viewBox="0 0 320 320" aria-hidden="true">
        <g className="radar-grid">
          {rings.map((ring, index) => <polygon key={index} points={ring} />)}
          {dimensions.map((_, index) => {
            const outer = point(index, count);
            return (
              <line
                key={index}
                x1={CENTER}
                y1={CENTER}
                x2={outer.x}
                y2={outer.y}
              />
            );
          })}
        </g>
        <polygon className="radar-area" points={pointsAttribute(values)} />
        <polyline
          className="radar-value"
          points={`${pointsAttribute(values)} ${values[0].x.toFixed(2)},${values[0].y.toFixed(2)}`}
        />
        <g className="radar-points">
          {values.map(({ x, y }, index) => (
            <circle key={index} cx={x} cy={y} r="4" />
          ))}
        </g>
      </svg>
      <span className="radar-scale radar-scale-max" aria-hidden="true">100</span>
      <span className="radar-scale radar-scale-mid" aria-hidden="true">50</span>
      <span className="radar-scale radar-scale-min" aria-hidden="true">0</span>
    </div>
  );
}
