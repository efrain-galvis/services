import { useId } from "react";
import {
  CAREER_TIMELINE_ENTRIES,
  CAREER_TIMELINE_FILTERS,
  createCareerTimelineView,
  type CareerTimelineEntry,
  type CareerTimelineFilter,
} from "./careerTimeline";

export type CareerTimelineProps = {
  entries?: CareerTimelineEntry[];
  filterOptions?: CareerTimelineFilter[];
  filters?: string[];
  highlightEvidenceIds?: string[];
  onFiltersChange?: (filters: string[]) => void;
  onClose?: () => void;
};

export default function CareerTimeline({
  entries = CAREER_TIMELINE_ENTRIES,
  filterOptions = CAREER_TIMELINE_FILTERS,
  filters = [],
  highlightEvidenceIds = [],
  onFiltersChange,
  onClose,
}: CareerTimelineProps) {
  const titleId = useId();
  const statusId = useId();
  const visibleEntries = createCareerTimelineView(
    entries,
    filters,
    highlightEvidenceIds,
  );

  function toggleFilter(filterId: string) {
    if (!onFiltersChange) return;
    onFiltersChange(
      filters.includes(filterId)
        ? filters.filter((id) => id !== filterId)
        : [...filters, filterId],
    );
  }

  return (
    <section className="timeline-card" aria-labelledby={titleId}>
      <header className="timeline-header">
        <div>
          <p className="timeline-kicker">LYRA / career timeline</p>
          <h2 id={titleId}>Published career milestones</h2>
          <p>
            A deliberately thin view of grounded public facts and directional
            eras—not a complete employment history.
          </p>
        </div>
        {onClose && (
          <button
            className="fit-close"
            type="button"
            onClick={onClose}
            aria-label="Close career timeline"
          >
            ×
          </button>
        )}
      </header>

      <div className="timeline-controls">
        <div
          className="timeline-filters"
          role="group"
          aria-label="Filter career milestones"
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
            const active = filters.includes(filter.id);
            return (
              <button
                type="button"
                className={active ? "active" : ""}
                aria-pressed={active}
                key={filter.id}
                onClick={() => toggleFilter(filter.id)}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        <p id={statusId} aria-live="polite">
          Showing {visibleEntries.length} of {entries.length} published milestones
        </p>
      </div>

      {visibleEntries.length ? (
        <ol className="timeline-list" aria-describedby={statusId}>
          {visibleEntries.map((entry) => (
            <li
              key={entry.id}
              className={entry.highlighted ? "timeline-item highlighted" : "timeline-item"}
            >
              <div className="timeline-marker" aria-hidden="true" />
              <article>
                <div className="timeline-item-heading">
                  <div>
                    <p className="timeline-date">{entry.dateRange}</p>
                    <h3>{entry.role}</h3>
                    <p className="timeline-organization">{entry.organizationLabel}</p>
                  </div>
                  <span className="timeline-status">
                    {entry.highlighted ? "Relevant evidence" : entry.evidenceStatus}
                  </span>
                </div>

                <dl className="timeline-facts">
                  <div>
                    <dt>Career level</dt>
                    <dd>{entry.careerLevel}</dd>
                  </div>
                  <div>
                    <dt>Key focus</dt>
                    <dd>{entry.keyFocus}</dd>
                  </div>
                  <div>
                    <dt>Key technologies</dt>
                    <dd>
                      {entry.technologies.length
                        ? entry.technologies.join(" · ")
                        : "Not published"}
                    </dd>
                  </div>
                </dl>

                <div className="timeline-achievements">
                  <h4>Selected evidence</h4>
                  {entry.achievements.length ? (
                    <ul>
                      {entry.achievements.map((achievement) => (
                        <li key={achievement}>{achievement}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No selected achievements are published for this milestone.</p>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ol>
      ) : (
        <div className="timeline-empty" role="status">
          <strong>No published milestone matches these filters.</strong>
          <p>Clear a filter to return to the verified public timeline.</p>
        </div>
      )}

      <footer className="timeline-footer">
        <p>
          Employer names, exact titles, progression, and technologies remain
          unpublished. Missing detail is not evidence of missing experience.
        </p>
        <span>Grounded / directional</span>
      </footer>
    </section>
  );
}
