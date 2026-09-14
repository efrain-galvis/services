import { useId } from "react";
import SkillRadar from "./SkillRadar";
import {
  createPlayerProfile,
  type PlayerProfileInput,
} from "./playerProfile";

export type PlayerCardProps = PlayerProfileInput & {
  onClose?: () => void;
};

export default function PlayerCard({
  fitDimensions,
  fitOverallScore,
  fitRoleTitle,
  onClose,
}: PlayerCardProps) {
  const titleId = useId();
  const profile = createPlayerProfile({
    fitDimensions,
    fitOverallScore,
    fitRoleTitle,
  });
  const isRoleRelative = profile.mode === "role-relative";

  return (
    <section className="player-card" aria-labelledby={titleId}>
      <header className="player-header">
        <div>
          <p className="player-kicker">LYRA / professional profile</p>
          <span className={`player-mode ${profile.mode}`}>
            {profile.modeLabel}
          </span>
        </div>
        {onClose && (
          <button
            className="fit-close"
            type="button"
            onClick={onClose}
            aria-label="Close player card"
          >
            ×
          </button>
        )}
      </header>

      <div className="player-identity">
        <div className="player-monogram" aria-hidden="true">EG</div>
        <div>
          <p className="player-number">Profile / 010</p>
          <h2 id={titleId}>{profile.name}</h2>
          <p className="player-title">{profile.title}</p>
          {profile.context && (
            <p className="player-context">
              Assessed against <strong>{profile.context}</strong>
            </p>
          )}
        </div>
        <div
          className="player-overall"
          role="img"
          aria-label={`${profile.modeLabel} overall score: ${profile.overallScore} percent`}
        >
          <span>Overall</span>
          <strong>{profile.overallScore}</strong>
          <small>/ 100</small>
        </div>
      </div>

      <div className="player-analysis">
        <div className="player-radar-panel">
          <div className="player-section-heading">
            <h3>SkillRadar</h3>
            <span>{profile.dimensions.length} dimensions</span>
          </div>
          <SkillRadar dimensions={profile.dimensions} />
        </div>

        <div className="player-stats">
          <div className="player-section-heading">
            <h3>{isRoleRelative ? "Fit dimensions" : "Core dimensions"}</h3>
            <span>Score / 100</span>
          </div>
          <ol>
            {profile.dimensions.map((dimension, index) => (
              <li key={`${dimension.name}-${index}`}>
                <span className="player-stat-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <div className="player-stat-heading">
                    <span>{dimension.name}</span>
                    <strong>{dimension.score}</strong>
                  </div>
                  <progress
                    className="player-meter"
                    max={100}
                    value={dimension.score}
                    aria-label={`${dimension.name}: ${dimension.score} percent`}
                  >
                    {dimension.score}%
                  </progress>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <footer className="player-footer">
        <p>
          {isRoleRelative
            ? "Role-relative AI estimate using the Fit assessment dimensions—not an absolute skill rating."
            : "Directional portfolio profile—not an independent or absolute skill rating."}
        </p>
        <span>LYRA / P2</span>
      </footer>
    </section>
  );
}
