export const PORTFOLIO_SECTIONS = [
  "lyra",
  "work",
  "selected-work",
  "career-timeline",
  "player-profile",
  "role-fit",
  "contact",
] as const;

export type PortfolioSectionId = (typeof PORTFOLIO_SECTIONS)[number];

export type PortfolioNavigationState = {
  active_section: PortfolioSectionId;
  selected_project: string | null;
  timeline_filter: string[];
  project_filters: string[];
  highlighted_section: PortfolioSectionId | null;
};

export const INITIAL_PORTFOLIO_STATE: PortfolioNavigationState = {
  active_section: "lyra",
  selected_project: null,
  timeline_filter: [],
  project_filters: [],
  highlighted_section: null,
};

export type PortfolioNavigationAction =
  | { type: "navigate"; sectionId: PortfolioSectionId }
  | { type: "highlight"; sectionId: PortfolioSectionId }
  | { type: "open_project"; projectId: string | null }
  | { type: "filter_projects"; filters: string[] }
  | { type: "open_timeline"; filters: string[] }
  | { type: "clear_highlight" };

function normalizedFilters(filters: string[]): string[] {
  return filters.reduce<string[]>((result, filter) => {
    const value = filter.trim();
    if (
      value &&
      !result.some((existing) => existing.toLowerCase() === value.toLowerCase())
    ) {
      result.push(value);
    }
    return result;
  }, []);
}

export function isPortfolioSectionId(
  value: string,
): value is PortfolioSectionId {
  return PORTFOLIO_SECTIONS.includes(value as PortfolioSectionId);
}

export function portfolioNavigationReducer(
  state: PortfolioNavigationState,
  action: PortfolioNavigationAction,
): PortfolioNavigationState {
  switch (action.type) {
    case "navigate":
      return {
        ...state,
        active_section: action.sectionId,
        highlighted_section: null,
      };
    case "highlight":
      return {
        ...state,
        active_section: action.sectionId,
        highlighted_section: action.sectionId,
      };
    case "open_project":
      return {
        ...state,
        active_section: "selected-work",
        selected_project: action.projectId,
        highlighted_section: null,
      };
    case "filter_projects":
      return {
        ...state,
        active_section: "selected-work",
        project_filters: normalizedFilters(action.filters),
        selected_project: null,
        highlighted_section: null,
      };
    case "open_timeline":
      return {
        ...state,
        active_section: "career-timeline",
        timeline_filter: normalizedFilters(action.filters),
        highlighted_section: null,
      };
    case "clear_highlight":
      return { ...state, highlighted_section: null };
  }
}

export type PortfolioNavigationDispatch = (
  action: PortfolioNavigationAction,
) => void;

export function createPortfolioActionHandlers(
  dispatch: PortfolioNavigationDispatch,
  availableProjectIds: string[],
) {
  const projectIds = new Set(availableProjectIds);

  return {
    navigateToSection(sectionId: string) {
      if (!isPortfolioSectionId(sectionId)) {
        return {
          ok: false,
          message: `Unknown section "${sectionId}".`,
          available_sections: PORTFOLIO_SECTIONS,
        };
      }
      dispatch({ type: "navigate", sectionId });
      return { ok: true, section_id: sectionId };
    },

    highlightSection(sectionId: string) {
      if (!isPortfolioSectionId(sectionId)) {
        return {
          ok: false,
          message: `Unknown section "${sectionId}".`,
          available_sections: PORTFOLIO_SECTIONS,
        };
      }
      dispatch({ type: "highlight", sectionId });
      return { ok: true, section_id: sectionId };
    },

    openProject(projectId: string) {
      const normalizedId = projectId.trim();
      const projectExists = projectIds.has(normalizedId);
      dispatch({
        type: "open_project",
        projectId: projectExists ? normalizedId : null,
      });
      return projectExists
        ? { ok: true, project_id: normalizedId }
        : {
            ok: false,
            project_id: normalizedId,
            message:
              "No public project with that ID is available. Opened Selected Work instead.",
          };
    },

    filterProjects(filters: string[]) {
      dispatch({ type: "filter_projects", filters });
      return { ok: true, criteria: normalizedFilters(filters) };
    },

    openTimeline(filters: string[]) {
      dispatch({ type: "open_timeline", filters });
      return { ok: true, filters: normalizedFilters(filters) };
    },

    showContactSection() {
      dispatch({ type: "navigate", sectionId: "contact" });
      return { ok: true, section_id: "contact" as const };
    },
  };
}
