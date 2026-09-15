import { describe, expect, it, vi } from "vitest";
import {
  createPortfolioActionHandlers,
  INITIAL_PORTFOLIO_STATE,
  portfolioNavigationReducer,
  type PortfolioNavigationAction,
} from "../src/portfolioNavigation";

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
});
