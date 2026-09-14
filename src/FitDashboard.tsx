import { FitAssessment, scoreBand } from "./fitAssessment";

type Props = {
  assessment: FitAssessment;
  onClose?: () => void;
};

function Evidence({
  title,
  evidence,
}: {
  title: string;
  evidence: string[];
}) {
  return (
    <details className="fit-evidence">
      <summary>
        <span>{title}</span>
        <span className="fit-evidence-count">
          {evidence.length ? `${evidence.length} source${evidence.length === 1 ? "" : "s"}` : "Evidence pending"}
        </span>
      </summary>
      <div>
        {evidence.length ? (
          <ul>
            {evidence.map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>No supporting detail is available yet. Treat this score as directional.</p>
        )}
      </div>
    </details>
  );
}

export default function FitDashboard({ assessment, onClose }: Props) {
  const counts = assessment.dimensions.reduce(
    (result, dimension) => {
      result[scoreBand(dimension.score)] += 1;
      return result;
    },
    { strong: 0, partial: 0, gap: 0 },
  );

  return (
    <section className="fit-dashboard" aria-labelledby="fit-dashboard-title">
      <header className="fit-header">
        <div>
          <p className="fit-kicker">LYRA / fit assessment</p>
          <h2 id="fit-dashboard-title">{assessment.roleTitle}</h2>
        </div>
        {onClose && (
          <button className="fit-close" type="button" onClick={onClose} aria-label="Close fit dashboard">
            ×
          </button>
        )}
      </header>

      <div className="fit-overview">
        <div
          className="fit-score"
          role="img"
          aria-label={`Overall fit score: ${assessment.overallScore} percent, ${assessment.label}`}
        >
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle className="fit-score-track" cx="50" cy="50" r="44" pathLength="100" />
            <circle
              className="fit-score-value"
              cx="50"
              cy="50"
              r="44"
              pathLength="100"
              strokeDasharray={`${assessment.overallScore} ${100 - assessment.overallScore}`}
            />
          </svg>
          <div>
            <strong>{assessment.overallScore}<span>%</span></strong>
            <small>overall fit</small>
          </div>
        </div>
        <div className="fit-verdict">
          <span>{assessment.label}</span>
          <p>{assessment.summary || "This assessment is based on the evidence currently available to LYRA."}</p>
        </div>
        <dl className="fit-counts" aria-label="Dimension score totals">
          <div><dt>Strong</dt><dd>{counts.strong}</dd></div>
          <div><dt>Partial</dt><dd>{counts.partial}</dd></div>
          <div><dt>Gap</dt><dd>{counts.gap}</dd></div>
        </dl>
      </div>

      <div className="fit-dimensions">
        <h3>Category scores</h3>
        <div className="fit-dimension-list">
          {assessment.dimensions.map((dimension) => {
            const band = scoreBand(dimension.score);
            return (
              <div className="fit-dimension" key={dimension.name}>
                <div className="fit-dimension-heading">
                  <span>{dimension.name}</span>
                  <strong>{dimension.score}%</strong>
                </div>
                <progress
                  className={`fit-meter ${band}`}
                  aria-label={`${dimension.name}: ${dimension.score} percent, ${band}`}
                  max={100}
                  value={dimension.score}
                >
                  {dimension.score}%
                </progress>
                {dimension.evidence.length > 0 && (
                  <Evidence title={`${dimension.name} evidence`} evidence={dimension.evidence} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="fit-detail-grid">
        <div>
          <h3>Strong matches <span>{assessment.matches.length}</span></h3>
          {assessment.matches.length ? assessment.matches.map((item, index) => (
            <Evidence key={`${item.title}-${index}`} {...item} />
          )) : <p className="fit-empty">No explicit matches were returned.</p>}
        </div>
        <div>
          <h3>Gaps to validate <span>{assessment.gaps.length}</span></h3>
          {assessment.gaps.length ? assessment.gaps.map((item, index) => (
            <Evidence key={`${item.title}-${index}`} {...item} />
          )) : <p className="fit-empty">No material gaps were identified from available evidence.</p>}
        </div>
      </div>

      <footer className="fit-footer">
        <p>Scores are directional, evidence-based signals—not a hiring decision.</p>
        <a href="#book">Discuss this fit <span aria-hidden="true">↗</span></a>
      </footer>
    </section>
  );
}
