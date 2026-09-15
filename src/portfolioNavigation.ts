import {
  adaptFitAssessment,
  type FitAssessment,
} from "./fitAssessment";

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

export type BookingStatus = "idle" | "submitting" | "submitted" | "failure";

export type BookingState = {
  status: BookingStatus;
};

export type PortfolioNavigationState = {
  visitor_intent: string | null;
  active_section: PortfolioSectionId;
  selected_project: string | null;
  timeline_filter: string[];
  job_fit_assessment: FitAssessment | null;
  visitor_timezone: string | null;
  conversation_id: string | null;
  booking_state: BookingState;
  project_filters: string[];
  highlighted_section: PortfolioSectionId | null;
  navigation_request: number;
};

export const INITIAL_PORTFOLIO_STATE: PortfolioNavigationState = {
  visitor_intent: null,
  active_section: "lyra",
  selected_project: null,
  timeline_filter: [],
  job_fit_assessment: null,
  visitor_timezone: null,
  conversation_id: null,
  booking_state: { status: "idle" },
  project_filters: [],
  highlighted_section: null,
  navigation_request: 0,
};

export type PortfolioNavigationAction =
  | {
      type: "navigate";
      sectionId: PortfolioSectionId;
      requestFocus?: boolean;
    }
  | {
      type: "highlight";
      sectionId: PortfolioSectionId;
      requestFocus?: boolean;
    }
  | {
      type: "open_project";
      projectId: string | null;
      requestFocus?: boolean;
    }
  | {
      type: "filter_projects";
      filters: string[];
      requestFocus?: boolean;
    }
  | {
      type: "open_timeline";
      filters: string[];
      requestFocus?: boolean;
    }
  | { type: "set_visitor_intent"; intent: string | null }
  | { type: "set_job_fit_assessment"; assessment: FitAssessment | null }
  | { type: "set_visitor_timezone"; timezone: string | null }
  | { type: "set_conversation_id"; conversationId: string | null }
  | { type: "set_booking_state"; status: BookingStatus }
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

function normalizedOptionalText(value: string | null, maxLength: number) {
  const normalized = value?.trim().slice(0, maxLength) || "";
  return normalized || null;
}

function intentForSection(sectionId: PortfolioSectionId): string {
  const intents: Record<PortfolioSectionId, string> = {
    lyra: "talk_with_lyra",
    work: "explore_services",
    "selected-work": "review_selected_work",
    "career-timeline": "review_career_timeline",
    "player-profile": "review_skill_profile",
    "role-fit": "assess_job_fit",
    contact: "request_conversation",
  };
  return intents[sectionId];
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
  const navigationRequest = (requestFocus?: boolean) =>
    requestFocus ? state.navigation_request + 1 : state.navigation_request;

  switch (action.type) {
    case "navigate":
      return {
        ...state,
        visitor_intent: intentForSection(action.sectionId),
        active_section: action.sectionId,
        highlighted_section: null,
        navigation_request: navigationRequest(action.requestFocus),
      };
    case "highlight":
      return {
        ...state,
        visitor_intent: intentForSection(action.sectionId),
        active_section: action.sectionId,
        highlighted_section: action.sectionId,
        navigation_request: navigationRequest(action.requestFocus),
      };
    case "open_project":
      return {
        ...state,
        visitor_intent: "review_project",
        active_section: "selected-work",
        selected_project: action.projectId,
        highlighted_section: null,
        navigation_request: navigationRequest(action.requestFocus),
      };
    case "filter_projects":
      return {
        ...state,
        visitor_intent: "find_supporting_projects",
        active_section: "selected-work",
        project_filters: normalizedFilters(action.filters),
        selected_project: null,
        highlighted_section: null,
        navigation_request: navigationRequest(action.requestFocus),
      };
    case "open_timeline":
      return {
        ...state,
        visitor_intent: "review_career_timeline",
        active_section: "career-timeline",
        timeline_filter: normalizedFilters(action.filters),
        highlighted_section: null,
        navigation_request: navigationRequest(action.requestFocus),
      };
    case "set_visitor_intent":
      return {
        ...state,
        visitor_intent: normalizedOptionalText(action.intent, 160),
      };
    case "set_job_fit_assessment":
      return {
        ...state,
        visitor_intent: action.assessment
          ? "review_job_fit_assessment"
          : state.visitor_intent,
        job_fit_assessment: action.assessment,
      };
    case "set_visitor_timezone":
      return {
        ...state,
        visitor_timezone: normalizedOptionalText(action.timezone, 100),
      };
    case "set_conversation_id":
      return {
        ...state,
        conversation_id: normalizedOptionalText(action.conversationId, 200),
      };
    case "set_booking_state":
      return {
        ...state,
        booking_state: { status: action.status },
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
      dispatch({ type: "navigate", sectionId, requestFocus: true });
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
      dispatch({ type: "highlight", sectionId, requestFocus: true });
      return { ok: true, section_id: sectionId };
    },

    openProject(projectId: string) {
      const normalizedId = projectId.trim();
      const projectExists = projectIds.has(normalizedId);
      dispatch({
        type: "open_project",
        projectId: projectExists ? normalizedId : null,
        requestFocus: true,
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
      dispatch({ type: "filter_projects", filters, requestFocus: true });
      return { ok: true, criteria: normalizedFilters(filters) };
    },

    openTimeline(filters: string[]) {
      dispatch({ type: "open_timeline", filters, requestFocus: true });
      return { ok: true, filters: normalizedFilters(filters) };
    },

    setVisitorIntent(intent: string) {
      const normalizedIntent = normalizedOptionalText(intent, 160);
      if (!normalizedIntent) {
        return { ok: false, message: "Visitor intent cannot be empty." };
      }
      dispatch({ type: "set_visitor_intent", intent: normalizedIntent });
      return { ok: true, visitor_intent: normalizedIntent };
    },

    showJobFitAssessment(value: unknown) {
      const assessment = adaptFitAssessment(value);
      if (!assessment) {
        return {
          ok: false,
          message: "The job fit assessment did not match the published schema.",
        };
      }
      dispatch({
        type: "navigate",
        sectionId: "role-fit",
        requestFocus: true,
      });
      dispatch({ type: "set_job_fit_assessment", assessment });
      return {
        ok: true,
        role_title: assessment.role_title,
        overall_score: assessment.overall_score,
      };
    },

    showContactSection() {
      dispatch({
        type: "navigate",
        sectionId: "contact",
        requestFocus: true,
      });
      return { ok: true, section_id: "contact" as const };
    },
  };
}
