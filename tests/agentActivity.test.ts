import { describe, expect, it } from "vitest";
import {
  agentActivityReducer,
  type AgentActivityState,
} from "../src/AgentActivity";

describe("agent activity reducer", () => {
  it("moves an operation through pending and success", () => {
    const pending = agentActivityReducer(null, {
      type: "start",
      id: "fit-1",
      label: "Analyzing job requirements…",
    });
    const success = agentActivityReducer(pending, {
      type: "succeed",
      id: "fit-1",
      label: "Matched against Efrain’s published experience.",
    });

    expect(pending).toEqual({
      id: "fit-1",
      label: "Analyzing job requirements…",
      status: "pending",
    });
    expect(success).toEqual({
      id: "fit-1",
      label: "Matched against Efrain’s published experience.",
      status: "success",
    });
  });

  it("shows failure and ignores stale operation completions", () => {
    const pending: AgentActivityState = {
      id: "project-2",
      label: "Finding supporting projects…",
      status: "pending",
    };

    expect(
      agentActivityReducer(pending, { type: "succeed", id: "older-run" }),
    ).toBe(pending);
    expect(
      agentActivityReducer(pending, { type: "fail", id: "project-2" }),
    ).toEqual({
      ...pending,
      status: "failure",
    });
  });

  it("clears a completed status", () => {
    expect(
      agentActivityReducer(
        { id: "done", label: "Complete", status: "success" },
        { type: "clear" },
      ),
    ).toBeNull();
  });
});
