import type { FitAssessment, FitMatch } from "./fitAssessment";

type Props = {
  assessment: FitAssessment;
  onClose?: () => void;
  onViewPlayerProfile?: () => void;
};

function MatchEvidence({ match }: { match: FitMatch }) {
  const hasEvidence = Boolean(match.evidence_id || match.evidence_text);
  return (
    <details className="fit-evidence">
      <summary>
        <span>{match.requirement}</span>
        <span className={`fit-level ${match.level.toLowerCase().replace(" ", "-")}`}>
          {match.level}
        </span>
      </summary>
      <div>
        {hasEvidence ? (
          <>
            {match.evidence_text && <p>{match.evidence_text}</p>}
            {match.evidence_id && <p className="fit-evidence-id">Evidence / {match.evidence_id}</p>}
          </>
        ) : (
          <p>No supporting evidence was found. Treat this requirement as unresolved.</p>
        )}
        <p className="fit-confidence">Confidence / {Math.round(match.confidence * 100)}%</p>
      </div>
    </details>
  );
}

export default function FitDashboard({
  assessment,
  onClose,
  onViewPlayerProfile,
}: Props) {
  const counts = assessment.matches.reduce(
    (result, match) => ({ ...result, [match.level]: result[match.level] + 1 }),
    { Strong: 0, Partial: 0, "No evidence": 0 },
  );

  return (
    <section className="fit-dashboard" aria-labelledby="fit-dashboard-title">
      <header className="fit-header">
        <div>
          <p className="fit-kicker">LYRA / fit assessment</p>
          <h2 id="fit-dashboard-title">{assessment.role_title || "Opportunity fit"}</h2>
          <p className="fit-estimate">{assessment.assessment_type} · directional, not a hiring decision</p>
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
          aria-label={`Overall fit score: ${assessment.overall_score} percent, ${assessment.label}`}
        >
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle className="fit-score-track" cx="50" cy="50" r="44" pathLength="100" />
            <circle
              className="fit-score-value"
              cx="50"
              cy="50"
              r="44"
              pathLength="100"
              strokeDasharray={`${assessment.overall_score} ${100 - assessment.overall_score}`}
            />
          </svg>
          <div>
            <strong>{assessment.overall_score}<span>%</span></strong>
            <small>overall fit</small>
          </div>
        </div>
        <div className="fit-verdict">
          <span>{assessment.label}</span>
          <p>{assessment.summary || "LYRA found too little evidence to summarize this fit reliably."}</p>
        </div>
        <dl className="fit-counts" aria-label="Requirement assessment totals">
          <div><dt>Strong</dt><dd>{counts.Strong}</dd></div>
          <div><dt>Partial</dt><dd>{counts.Partial}</dd></div>
          <div><dt>No evidence</dt><dd>{counts["No evidence"]}</dd></div>
          <div><dt>Potential gaps</dt><dd>{assessment.gaps.length}</dd></div>
        </dl>
      </div>

      <div className="fit-dimensions">
        <h3>Category scores</h3>
        <div className="fit-dimension-list">
          {assessment.dimensions.length ? assessment.dimensions.map((dimension) => (
              <div className="fit-dimension" key={dimension.name}>
                <div className="fit-dimension-heading">
                  <span>{dimension.name}</span>
                  <strong>{dimension.score}%</strong>
                </div>
                <progress
                  className="fit-meter"
                  aria-label={`${dimension.name}: ${dimension.score} percent`}
                  max={100}
                  value={dimension.score}
                >
                  {dimension.score}%
                </progress>
              </div>
            )) : <p className="fit-empty">No category scores were returned.</p>}
        </div>
      </div>

      <div className="fit-detail-grid">
        <div>
          <h3>Requirement matches <span>{assessment.matches.length}</span></h3>
          {assessment.matches.length ? assessment.matches.map((item, index) => (
            <MatchEvidence key={`${item.requirement}-${index}`} match={item} />
          )) : <p className="fit-empty">No requirements had enough evidence to assess.</p>}
        </div>
        <div>
          <h3>Potential gaps <span>{assessment.gaps.length}</span></h3>
          {assessment.gaps.length ? (
            <ul className="fit-gaps">
              {assessment.gaps.map((gap, index) => <li key={`${gap}-${index}`}>{gap}</li>)}
            </ul>
          ) : <p className="fit-empty">No potential gaps were returned. This is not proof that none exist.</p>}
        </div>
      </div>

      <footer className="fit-footer">
        <p>{assessment.assessment_type}. Validate thin or missing evidence in conversation.</p>
        <div className="fit-footer-actions">
          {onViewPlayerProfile && assessment.dimensions.length > 0 && (
            <button type="button" onClick={onViewPlayerProfile}>
              View role profile <span aria-hidden="true">↗</span>
            </button>
          )}
          <a href="#book">Discuss this fit <span aria-hidden="true">↗</span></a>
        </div>
      </footer>
    </section>
  );
}
