import { describe, expect, it } from "vitest";
import type { TimelineElement } from "../store/playerStore";
import type { StackingTimelineLayer } from "./timelineTrackOrder";
import { resolveTimelineLayerZIndexChanges } from "./timelineLayerDrag";

function element(input: { id: string; zIndex: number; tag?: string }): TimelineElement {
  return {
    id: input.id,
    tag: input.tag ?? "div",
    start: 0,
    duration: 1,
    track: 0,
    zIndex: input.zIndex,
    hasExplicitZIndex: true,
    stackingContextId: "root",
    parentCompositionId: null,
    compositionAncestors: ["root"],
  };
}

function layer(id: string, zIndex: number): StackingTimelineLayer {
  return {
    id,
    kind: "visual",
    contextKey: "root",
    zIndex,
    placementTrack: 0,
    elements: [element({ id, zIndex })],
  };
}

describe("resolveTimelineLayerZIndexChanges", () => {
  it("joins an existing layer by assigning the dragged clip that layer's z-index", () => {
    const dragged = element({ id: "dragged", zIndex: 1 });

    expect(
      resolveTimelineLayerZIndexChanges({
        element: dragged,
        layers: [layer("front", 10), layer("back", 1)],
        placement: { type: "onto", layerId: "front" },
      })?.zIndexChanges,
    ).toEqual([{ key: "dragged", zIndex: 10 }]);
  });

  it("interpolates a new integer z-index strictly between neighboring layers", () => {
    const dragged = element({ id: "dragged", zIndex: 1 });

    expect(
      resolveTimelineLayerZIndexChanges({
        element: dragged,
        layers: [layer("front", 10), layer("back", 4)],
        placement: { type: "between", beforeLayerId: "front", afterLayerId: "back" },
      })?.zIndexChanges,
    ).toEqual([{ key: "dragged", zIndex: 7 }]);
  });

  it("renumbers the minimum sibling set when adjacent layers leave no integer gap", () => {
    const dragged = element({ id: "dragged", zIndex: 0 });

    expect(
      resolveTimelineLayerZIndexChanges({
        element: dragged,
        layers: [layer("front", 2), layer("back", 1), layer("lower", 0)],
        placement: { type: "between", beforeLayerId: "front", afterLayerId: "back" },
      })?.zIndexChanges,
    ).toEqual([
      { key: "dragged", zIndex: 2 },
      { key: "front", zIndex: 3 },
    ]);
  });

  it("assigns new extreme z-index values above the top and below the bottom layer", () => {
    const dragged = element({ id: "dragged", zIndex: 0 });
    const layers = [layer("front", 10), layer("back", -2)];

    expect(
      resolveTimelineLayerZIndexChanges({
        element: dragged,
        layers,
        placement: { type: "above", layerId: "front" },
      })?.zIndexChanges,
    ).toEqual([{ key: "dragged", zIndex: 11 }]);

    expect(
      resolveTimelineLayerZIndexChanges({
        element: dragged,
        layers,
        placement: { type: "below", layerId: "back" },
      })?.zIndexChanges,
    ).toEqual([{ key: "dragged", zIndex: -3 }]);
  });

  it("does not resolve stacking z-index changes for audio clips", () => {
    expect(
      resolveTimelineLayerZIndexChanges({
        element: element({ id: "music", zIndex: 0, tag: "audio" }),
        layers: [layer("front", 10)],
        placement: { type: "onto", layerId: "front" },
      }),
    ).toBeNull();
  });
});
