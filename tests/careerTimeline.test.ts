import { describe, expect, it } from "vitest";
import {
  CAREER_TIMELINE_ENTRIES,
  createCareerTimelineView,
  filterCareerTimeline,
  getCareerTimelineStatus,
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

  it("preserves directional status when an entry is highlighted", () => {
    const [result] = createCareerTimelineView(
      [entry({
        evidenceStatus: "directional",
        evidenceIds: ["directional-evidence"],
      })],
      [],
      ["directional-evidence"],
    );

    expect(result).toMatchObject({
      evidenceStatus: "directional",
      highlighted: true,
    });
    expect(getCareerTimelineStatus(result))
      .toBe("Directional era · Relevant evidence");
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

  it("grounds the published timeline in known evidence without employer names", () => {
    expect(CAREER_TIMELINE_ENTRIES).toHaveLength(5);
    expect(CAREER_TIMELINE_ENTRIES.flatMap(({ evidenceIds }) => evidenceIds))
      .toEqual(expect.arrayContaining([
        "exp.data-ai.since-2014",
        "exp.ml-ai.seven-plus-years",
        "exp.genai.three-plus-years",
        "exp.us-enterprise.since-2021",
      ]));
    expect(
      CAREER_TIMELINE_ENTRIES
        .filter(({ dateRange }) => dateRange.startsWith("~"))
        .every(({ evidenceStatus }) => evidenceStatus === "directional"),
    ).toBe(true);
    expect(
      CAREER_TIMELINE_ENTRIES.every(
        ({ careerLevel }) => careerLevel === "Not published",
      ),
    ).toBe(true);
    expect(
      CAREER_TIMELINE_ENTRIES.every(({ organizationLabel }) =>
        [
          "Early career analytics",
          "Organization not published",
          "US enterprise clients",
          "Independent practice",
        ].includes(organizationLabel),
      ),
    ).toBe(true);
  });
});
