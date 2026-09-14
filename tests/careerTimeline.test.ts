import { describe, expect, it } from "vitest";
import {
  CAREER_TIMELINE_ENTRIES,
  createCareerTimelineView,
  filterCareerTimeline,
  isCareerEntryHighlighted,
  type CareerTimelineEntry,
} from "../src/careerTimeline";

const entry = (override: Partial<CareerTimelineEntry>): CareerTimelineEntry => ({
  id: "entry",
  dateRange: "From 2014",
  role: "Published role",
  organizationLabel: "Sanitized organization",
  careerLevel: "Not published",
  keyFocus: "Published focus",
  technologies: [],
  achievements: [],
  tags: [],
  evidenceIds: [],
  evidenceStatus: "verified",
  ...override,
});

describe("career timeline adapters", () => {
  it("returns a copy of every entry when no filters are active", () => {
    const result = filterCareerTimeline(CAREER_TIMELINE_ENTRIES);

    expect(result).toEqual(CAREER_TIMELINE_ENTRIES);
    expect(result).not.toBe(CAREER_TIMELINE_ENTRIES);
  });

  it("filters by any active tag without case sensitivity", () => {
    const entries = [
      entry({ id: "ai", tags: ["AI"] }),
      entry({ id: "platform", tags: ["MLOps"] }),
      entry({ id: "lead", tags: ["leadership"] }),
    ];

    expect(filterCareerTimeline(entries, ["ai", "MLOPS"]).map(({ id }) => id))
      .toEqual(["ai", "platform"]);
  });

  it("highlights only entries backed by requested evidence ids", () => {
    const item = entry({
      evidenceIds: ["career-start-2014", "portfolio-data"],
    });

    expect(isCareerEntryHighlighted(item, ["CAREER-START-2014"])).toBe(true);
    expect(isCareerEntryHighlighted(item, ["unrelated-evidence"])).toBe(false);
  });

  it("combines filtering and highlighting without mutating source entries", () => {
    const entries = [
      entry({ id: "data", tags: ["data"], evidenceIds: ["data-evidence"] }),
      entry({ id: "enterprise", tags: ["enterprise"], evidenceIds: ["enterprise-evidence"] }),
    ];
    const result = createCareerTimelineView(
      entries,
      ["enterprise"],
      ["enterprise-evidence"],
    );

    expect(result).toEqual([
      expect.objectContaining({ id: "enterprise", highlighted: true }),
    ]);
    expect(entries[1]).not.toHaveProperty("highlighted");
  });
});
