import { useId, useState } from "react";
import ArchitectureDiagram from "./ArchitectureDiagram";
import type { ArchitectureDiagramModel } from "./architecture";
import ProjectCard from "./ProjectCard";
import {
  filterProjects,
  getProjectFilters,
  PUBLISHED_PROJECTS,
  PROJECT_CARD_DEVELOPMENT_FIXTURE,
  PROJECTS_THIN_STATE,
  type Project,
  type ProjectsThinState,
} from "./projects";

export type ProjectGridProps = {
  projects?: Project[];
  thinState?: ProjectsThinState;
  showDevelopmentFixture?: boolean;
  filters?: string[];
  selectedProjectId?: string | null;
  onFiltersChange?: (filters: string[]) => void;
  onProjectSelect?: (projectId: string) => void;
  onClose?: () => void;
};

type ArchitectureFixtureModule = typeof import("./architecture.fixture");
type ArchitectureFixtureLoader = () => Promise<ArchitectureFixtureModule>;

export async function loadDevelopmentFixture(
  loadFixture: ArchitectureFixtureLoader = () => import("./architecture.fixture"),
): Promise<{ project: Project | null; error: string }> {
  try {
    const { ARCHITECTURE_DEVELOPMENT_FIXTURE } = await loadFixture();
    return {
      project: {
        ...PROJECT_CARD_DEVELOPMENT_FIXTURE,
        architectureGraph: ARCHITECTURE_DEVELOPMENT_FIXTURE,
      },
      error: "",
    };
  } catch {
    return {
      project: null,
      error: "Development fixture could not load. Try again.",
    };
  }
}

export default function ProjectGrid({
  projects = PUBLISHED_PROJECTS,
  thinState = PROJECTS_THIN_STATE,
  showDevelopmentFixture = false,
  filters = [],
  selectedProjectId = null,
  onFiltersChange,
  onProjectSelect,
  onClose,
}: ProjectGridProps) {
  const titleId = useId();
  const statusId = useId();
  const fixtureErrorId = useId();
  const [fixtureProject, setFixtureProject] = useState<Project | null>(null);
  const [fixtureBusy, setFixtureBusy] = useState(false);
  const [fixtureError, setFixtureError] = useState("");
  const [activeArchitecture, setActiveArchitecture] =
    useState<ArchitectureDiagramModel | null>(null);
  const sourceProjects =
    fixtureProject && projects.length === 0
      ? [fixtureProject]
      : projects;
  const filterOptions = getProjectFilters(sourceProjects);
  const visibleProjects = filterProjects(sourceProjects, filters);

  function toggleFilter(filter: string) {
    onFiltersChange?.(
      filters.includes(filter)
        ? filters.filter((value) => value !== filter)
        : [...filters, filter],
    );
  }

  async function handleLoadDevelopmentFixture() {
    if (!showDevelopmentFixture || fixtureBusy) return;
    setFixtureBusy(true);
    setFixtureError("");
    try {
      const result = await loadDevelopmentFixture();
      setFixtureProject(result.project);
      setFixtureError(result.error);
    } catch {
      // Keep the event handler rejection-safe if fixture loading changes later.
      setFixtureProject(null);
      setFixtureError("Development fixture could not load. Try again.");
    } finally {
      setFixtureBusy(false);
    }
  }

  if (activeArchitecture) {
    return (
      <ArchitectureDiagram
        diagram={activeArchitecture}
        onClose={() => setActiveArchitecture(null)}
      />
    );
  }

  return (
    <section className="project-grid-shell" aria-labelledby={titleId}>
      <header className="project-grid-header">
        <div>
          <p className="project-kicker">LYRA / selected work</p>
          <h2 id={titleId}>Grounded project cards</h2>
          <p>
            Structured project evidence only. Unpublished details are left
            empty, never inferred.
          </p>
        </div>
        {onClose && (
          <button
            className="fit-close"
            type="button"
            onClick={onClose}
            aria-label="Close selected work"
          >
            ×
          </button>
        )}
      </header>

      {sourceProjects.length > 0 && (
        <div className="project-controls">
          <div
            className="project-filters"
            role="group"
            aria-label="Filter projects by skill or technology"
          >
            <button
              type="button"
              className={filters.length === 0 ? "active" : ""}
              aria-pressed={filters.length === 0}
              onClick={() => onFiltersChange?.([])}
            >
              All
            </button>
            {filterOptions.map((filter) => {
              const active = filters.includes(filter);
              return (
                <button
                  type="button"
                  className={active ? "active" : ""}
                  aria-pressed={active}
                  key={filter}
                  onClick={() => toggleFilter(filter)}
                >
                  {filter}
                </button>
              );
            })}
          </div>
          <p id={statusId} aria-live="polite">
            Showing {visibleProjects.length} of {sourceProjects.length} projects
          </p>
        </div>
      )}

      {sourceProjects.length === 0 ? (
        <div className="project-thin-state" role="status">
          <span>Thin public evidence</span>
          <h3>{thinState.title}</h3>
          <p>{thinState.description}</p>
          <small>Evidence / {thinState.evidenceId}</small>
          {showDevelopmentFixture && (
            <button
              type="button"
              disabled={fixtureBusy}
              aria-describedby={fixtureError ? fixtureErrorId : undefined}
              onClick={() => void handleLoadDevelopmentFixture()}
            >
              {fixtureBusy
                ? "Loading fixture…"
                : fixtureError
                  ? "Retry development fixture"
                  : "Load development fixture"}
            </button>
          )}
          {fixtureError ? (
            <p className="project-fixture-error" id={fixtureErrorId} role="alert">
              {fixtureError}
            </p>
          ) : null}
        </div>
      ) : visibleProjects.length > 0 ? (
        <div className="project-grid" aria-describedby={statusId}>
          {visibleProjects.map((project, index) => (
            <ProjectCard
              project={project}
              index={index}
              key={project.id}
              selected={selectedProjectId === project.id}
              onSelect={(selectedProject) =>
                onProjectSelect?.(selectedProject.id)
              }
              onExploreArchitecture={(selectedProject) => {
                if (selectedProject.architectureGraph) {
                  setActiveArchitecture(selectedProject.architectureGraph);
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className="project-empty" role="status">
          <strong>No project matches these filters.</strong>
          <p>Clear a filter to return to the available project cards.</p>
        </div>
      )}

      <footer className="project-grid-footer">
        <p>
          Fuller cards wait on Efrain’s published knowledge updates. Private
          client information is not displayed.
        </p>
        <span>Grounded / FR-013</span>
      </footer>
    </section>
  );
}
