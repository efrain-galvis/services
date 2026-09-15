import { describe, expect, it, vi } from "vitest";
import {
  createPortfolioActionHandlers,
  INITIAL_PORTFOLIO_STATE,
  portfolioNavigationReducer,
  type PortfolioNavigationAction,
} from "../src/portfolioNavigation";
import { FIT_ASSESSMENT_FIXTURE } from "../src/fitAssessment";

describe("portfolio navigation reducer", () => {
  it("keeps active section, selected project, and filters in shared state", () => {
    const withProject = portfolioNavigationReducer(INITIAL_PORTFOLIO_STATE, {
      type: "open_project",
      projectId: "agent-platform",
    });
    const withTimeline = portfolioNavigationReducer(withProject, {
      type: "open_timeline",
      filters: [" genai ", "GENAI", "enterprise"],
    });
    const result = portfolioNavigationReducer(withTimeline, {
      type: "filter_projects",
      filters: [" Agent systems ", "agent SYSTEMS", "TypeScript"],
    });

    expect(result).toMatchObject({
      active_section: "selected-work",
      selected_project: null,
      timeline_filter: ["genai", "enterprise"],
      project_filters: ["Agent systems", "TypeScript"],
    });
  });

  it("tracks and clears a temporary section highlight", () => {
    const highlighted = portfolioNavigationReducer(INITIAL_PORTFOLIO_STATE, {
      type: "highlight",
      sectionId: "work",
    });

    expect(highlighted).toMatchObject({
      active_section: "work",
      highlighted_section: "work",
    });
    expect(
      portfolioNavigationReducer(highlighted, { type: "clear_highlight" })
        .highlighted_section,
    ).toBeNull();
  });

  it("synchronizes visitor, fit, session, timezone, and booking fields", () => {
    const actions: PortfolioNavigationAction[] = [
      { type: "set_visitor_intent", intent: "  assess a role  " },
      {
        type: "set_job_fit_assessment",
        assessment: FIT_ASSESSMENT_FIXTURE,
      },
      { type: "set_visitor_timezone", timezone: " America/New_York " },
      { type: "set_conversation_id", conversationId: " conversation-123 " },
      { type: "set_booking_state", status: "submitting" },
      { type: "set_booking_state", status: "submitted" },
    ];
    const result = actions.reduce(
      portfolioNavigationReducer,
      INITIAL_PORTFOLIO_STATE,
    );

    expect(result).toMatchObject({
      visitor_intent: "review_job_fit_assessment",
      job_fit_assessment: FIT_ASSESSMENT_FIXTURE,
      visitor_timezone: "America/New_York",
      conversation_id: "conversation-123",
      booking_state: { status: "submitted" },
    });
  });

  it("derives visitor intent from UI navigation changes", () => {
    const selected = portfolioNavigationReducer(INITIAL_PORTFOLIO_STATE, {
      type: "open_project",
      projectId: "published",
    });
    const booking = portfolioNavigationReducer(selected, {
      type: "navigate",
      sectionId: "contact",
    });

    expect(selected.visitor_intent).toBe("review_project");
    expect(booking.visitor_intent).toBe("request_conversation");
  });
});

describe("portfolio frontend action handlers", () => {
  it("dispatches controlled actions for valid sections and contact", () => {
    const dispatch = vi.fn<(action: PortfolioNavigationAction) => void>();
    const actions = createPortfolioActionHandlers(dispatch, []);

    expect(actions.navigateToSection("career-timeline")).toEqual({
      ok: true,
      section_id: "career-timeline",
    });
    expect(actions.showContactSection()).toEqual({
      ok: true,
      section_id: "contact",
    });
    expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
      {
        type: "navigate",
        sectionId: "career-timeline",
        requestFocus: true,
      },
      { type: "navigate", sectionId: "contact", requestFocus: true },
    ]);
  });

  it("rejects unknown sections without dispatching arbitrary DOM targets", () => {
    const dispatch = vi.fn<(action: PortfolioNavigationAction) => void>();
    const result = createPortfolioActionHandlers(dispatch, [])
      .navigateToSection("<script>");

    expect(result).toMatchObject({ ok: false });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("opens the thin Selected Work state for an unavailable project", () => {
    const dispatch = vi.fn<(action: PortfolioNavigationAction) => void>();
    const actions = createPortfolioActionHandlers(dispatch, ["published"]);

    expect(actions.openProject("missing")).toMatchObject({
      ok: false,
      project_id: "missing",
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "open_project",
      projectId: null,
      requestFocus: true,
    });

    expect(actions.openProject("published")).toEqual({
      ok: true,
      project_id: "published",
    });
  });

  it("accepts only schema-valid fit assessments from an agent tool", () => {
    const dispatch = vi.fn<(action: PortfolioNavigationAction) => void>();
    const actions = createPortfolioActionHandlers(dispatch, []);

    expect(actions.showJobFitAssessment({ role_title: "Incomplete" })).toEqual({
      ok: false,
      message: "The job fit assessment did not match the published schema.",
    });
    expect(dispatch).not.toHaveBeenCalled();

    expect(actions.showJobFitAssessment(FIT_ASSESSMENT_FIXTURE)).toMatchObject({
      ok: true,
      role_title: FIT_ASSESSMENT_FIXTURE.role_title,
    });
    expect(dispatch).toHaveBeenCalledWith({
      type: "set_job_fit_assessment",
      assessment: FIT_ASSESSMENT_FIXTURE,
    });
  });
});
