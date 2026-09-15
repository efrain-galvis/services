import { useId } from "react";
import type { Project } from "./projects";

export type ProjectCardProps = {
  project: Project;
  index?: number;
  selected?: boolean;
  onSelect?: (project: Project) => void;
  onExploreArchitecture?: (project: Project) => void;
};

function DetailList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (!items.length) return null;

  return (
    <section className="project-detail-list">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  );
}

export default function ProjectCard({
  project,
  index = 0,
  selected = false,
  onSelect,
  onExploreArchitecture,
}: ProjectCardProps) {
  const titleId = useId();
  const architectureDescriptionId = useId();
  const isConfidential = project.confidentialityLevel === "confidential";
  const confidentialityLabel =
    project.confidentialityLevel === "anonymized"
      ? "Anonymized"
      : project.confidentialityLevel === "confidential"
        ? "Confidential / redacted"
        : project.confidentialityLevel === "public"
          ? "Public"
          : null;

  if (isConfidential) {
    return (
      <section className="project-card project-card-redacted" aria-labelledby={titleId}>
        <header className="project-card-header">
          <div>
            <p className="project-kicker">
              Project / {String(index + 1).padStart(2, "0")}
            </p>
            <h3 id={titleId}>Confidential project</h3>
          </div>
          <span className="project-confidentiality confidential">
            {confidentialityLabel}
          </span>
        </header>
        <div className="project-redacted-message">
          <strong>Project details are not published.</strong>
          <p>
            Private client information, project identifiers, evidence, and
            outcomes are intentionally withheld.
          </p>
        </div>
      </section>
    );
  }

  const hasOverview = Boolean(project.role || project.architecture);
  const hasDetails = Boolean(
    project.responsibilities.length ||
    project.productionConsiderations.length ||
    project.measurableResults.length,
  );
  const architectureDescription = project.architectureGraph
    ? project.developmentFixture
      ? "Open the development fixture architecture nodes and flows."
      : "Open the published architecture nodes and flows."
    : "Unavailable until a published architecture graph is linked to this project.";

  return (
    <section
      className={`project-card${selected ? " selected" : ""}`}
      id={`project-${project.id}`}
      tabIndex={-1}
      aria-labelledby={titleId}
    >
      <header className="project-card-header">
        <div>
          <p className="project-kicker">
            Project / {String(index + 1).padStart(2, "0")}
          </p>
          <h3 id={titleId}>{project.name}</h3>
        </div>
        <div className="project-labels">
          {project.developmentFixture && (
            <span className="project-fixture-label">Development fixture</span>
          )}
          {confidentialityLabel && (
            <span className={`project-confidentiality ${project.confidentialityLevel}`}>
              {confidentialityLabel}
            </span>
          )}
        </div>
      </header>

      {project.developmentFixture && (
        <p className="project-fixture-warning">
          Layout QA only — not production content or portfolio evidence.
        </p>
      )}

      {project.problem && (
        <div className="project-problem">
          <span>Problem</span>
          <p>{project.problem}</p>
        </div>
      )}

      {hasOverview && (
        <dl className="project-overview">
          {project.role && (
            <div>
              <dt>Role</dt>
              <dd>{project.role}</dd>
            </div>
          )}
          {project.architecture && (
            <div>
              <dt>Architecture</dt>
              <dd>{project.architecture}</dd>
            </div>
          )}
        </dl>
      )}

      {hasDetails && (
        <div className="project-detail-grid">
          <DetailList title="Responsibilities" items={project.responsibilities} />
          <DetailList
            title="Production considerations"
            items={project.productionConsiderations}
          />
          <DetailList title="Published results" items={project.measurableResults} />
        </div>
      )}

      {(project.technologies.length > 0 || project.relatedSkills.length > 0) && (
        <div className="project-taxonomy">
          {project.technologies.length > 0 && (
            <div>
              <span>Technologies</span>
              <ul>
                {project.technologies.map((technology) => (
                  <li key={technology}>{technology}</li>
                ))}
              </ul>
            </div>
          )}
          {project.relatedSkills.length > 0 && (
            <div>
              <span>Related skills</span>
              <ul>
                {project.relatedSkills.map((skill) => <li key={skill}>{skill}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      <footer className="project-card-footer">
        <p>
          {project.evidenceId
            ? <>Evidence / <span>{project.evidenceId}</span></>
            : "No public evidence ID supplied"}
        </p>
        <div className="project-card-actions">
          {onSelect && (
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(project)}
            >
              {selected ? "Selected" : "Select project"}
            </button>
          )}
          <button
            type="button"
            aria-disabled={!project.architectureGraph}
            aria-describedby={architectureDescriptionId}
            onClick={() => {
              if (project.architectureGraph) {
                onSelect?.(project);
                onExploreArchitecture?.(project);
              }
            }}
          >
            Explore architecture <span aria-hidden="true">↗</span>
          </button>
        </div>
      </footer>
      <p className="project-architecture-description" id={architectureDescriptionId}>
        {architectureDescription}
      </p>
    </section>
  );
}
