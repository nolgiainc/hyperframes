import { describe, expect, it } from "vitest";
import type { TimelineElement } from "../store/playerStore";
import { buildStackingTimelineLayers, insertPreviewTrackOrder } from "./timelineTrackOrder";

// fallow-ignore-next-line complexity
function rowElement(input: {
  id: string;
  track?: number;
  zIndex?: number;
  hasExplicitZIndex?: boolean;
  start?: number;
  duration?: number;
  tag?: string;
  stackingContextId?: string | null;
  parentCompositionId?: string | null;
  compositionAncestors?: string[];
}): TimelineElement {
  return {
    id: input.id,
    tag: input.tag ?? "div",
    start: input.start ?? 0,
    duration: input.duration ?? 1,
    track: input.track ?? 0,
    zIndex: input.zIndex ?? 0,
    hasExplicitZIndex: input.hasExplicitZIndex ?? true,
    stackingContextId: input.stackingContextId ?? "root",
    parentCompositionId: input.parentCompositionId ?? null,
    compositionAncestors: input.compositionAncestors ?? ["root"],
  };
}

function rowIds(rows: readonly { elements: readonly TimelineElement[] }[]): string[][] {
  return rows.map((row) => row.elements.map((element) => element.id));
}

describe("buildStackingTimelineLayers", () => {
  it("merges explicit same-z clips in one context when they do not overlap in time", () => {
    const result = buildStackingTimelineLayers([
      rowElement({ id: "a", zIndex: 5, start: 0, duration: 1 }),
      rowElement({ id: "b", zIndex: 5, start: 1, duration: 1 }),
    ]);

    expect(rowIds(result.visualLayers)).toEqual([["a", "b"]]);
  });

  it("splits explicit same-z clips in one context when they overlap in time", () => {
    const result = buildStackingTimelineLayers([
      rowElement({ id: "a", track: 2, zIndex: 5, start: 0, duration: 2 }),
      rowElement({ id: "b", track: 0, zIndex: 5, start: 1, duration: 2 }),
    ]);

    expect(rowIds(result.visualLayers)).toEqual([["b"], ["a"]]);
  });

  it("keeps auto-z clips in their own rows even when their computed z-index ties", () => {
    const result = buildStackingTimelineLayers([
      rowElement({ id: "a", zIndex: 0, hasExplicitZIndex: false }),
      rowElement({ id: "b", zIndex: 0, hasExplicitZIndex: false }),
    ]);

    expect(rowIds(result.visualLayers)).toEqual([["a"], ["b"]]);
  });

  it("does not merge equal z-index clips across stacking contexts", () => {
    const result = buildStackingTimelineLayers([
      rowElement({ id: "root", zIndex: 4, start: 0, duration: 1 }),
      rowElement({
        id: "nested",
        zIndex: 4,
        start: 1,
        duration: 1,
        stackingContextId: "scene",
        parentCompositionId: "scene",
        compositionAncestors: ["root", "scene"],
      }),
    ]);

    expect(rowIds(result.visualLayers)).toEqual([["root"], ["nested"]]);
  });

  it("returns audio clips as separate bottom rows without merging them into z layers", () => {
    const result = buildStackingTimelineLayers([
      rowElement({ id: "front", zIndex: 10 }),
      rowElement({ id: "music-a", tag: "audio", track: 4 }),
      rowElement({ id: "music-b", tag: "audio", track: 2 }),
    ]);

    expect(rowIds(result.visualLayers)).toEqual([["front"]]);
    expect(rowIds(result.audioLayers)).toEqual([["music-a"], ["music-b"]]);
    expect(rowIds(result.rows)).toEqual([["front"], ["music-a"], ["music-b"]]);
  });

  it("orders rows by descending z-index with auto-z clips ranked at computed zero", () => {
    const result = buildStackingTimelineLayers([
      rowElement({ id: "auto-a", zIndex: 0, hasExplicitZIndex: false }),
      rowElement({ id: "back", zIndex: -1 }),
      rowElement({ id: "front", zIndex: 10 }),
      rowElement({ id: "auto-b", zIndex: 0, hasExplicitZIndex: false }),
    ]);

    expect(rowIds(result.visualLayers)).toEqual([["front"], ["auto-a"], ["auto-b"], ["back"]]);
  });

  it("keeps a row key stable when a clip's z-index changes but membership does not", () => {
    const before = buildStackingTimelineLayers([rowElement({ id: "hero", zIndex: 1 })]);
    const after = buildStackingTimelineLayers([rowElement({ id: "hero", zIndex: 20 })]);

    expect(after.visualLayers[0]?.id).toBe(before.visualLayers[0]?.id);
  });
});

describe("insertPreviewTrackOrder", () => {
  it("inserts preview layer ids by target row index", () => {
    expect(insertPreviewTrackOrder(["a", "b", "c"], "preview", 1)).toEqual([
      "a",
      "preview",
      "b",
      "c",
    ]);
  });
});
