// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TimelineElement } from "../store/playerStore";
import { usePlayerStore } from "../store/playerStore";
import { TRACK_H } from "./timelineLayout";
import { buildStackingTimelineLayers } from "./timelineTrackOrder";
import type { DraggedClipState } from "./useTimelineClipDrag";
import { useTimelineClipDrag } from "./useTimelineClipDrag";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function timelineElement(input: { id: string; track: number; zIndex: number }): TimelineElement {
  return {
    id: input.id,
    domId: input.id,
    tag: "div",
    start: 0,
    duration: 2,
    track: input.track,
    zIndex: input.zIndex,
    stackingContextId: "root",
    parentCompositionId: null,
    compositionAncestors: ["root"],
    sourceFile: "index.html",
    timingSource: "authored",
  };
}

afterEach(() => {
  document.body.innerHTML = "";
  usePlayerStore.getState().reset();
});

describe("useTimelineClipDrag", () => {
  it("passes sibling-scoped stacking intent on vertical drag commit", async () => {
    const front = timelineElement({ id: "front", track: 0, zIndex: 3 });
    const middle = timelineElement({ id: "middle", track: 1, zIndex: 2 });
    const back = timelineElement({ id: "back", track: 2, zIndex: 1 });
    const layers = buildStackingTimelineLayers([front, middle, back]).rows;
    const scroll = document.createElement("div");
    document.body.append(scroll);
    const onMoveElement = vi.fn();
    let setDraggedClip: ((state: DraggedClipState | null) => void) | null = null;

    function Harness() {
      const hook = useTimelineClipDrag({
        scrollRef: { current: scroll },
        ppsRef: { current: 100 },
        durationRef: { current: 10 },
        trackOrderRef: { current: layers.map((layer) => layer.id) },
        timelineLayersRef: { current: layers },
        timelineElementsRef: { current: [front, middle, back] },
        onMoveElement,
        onResizeElement: vi.fn(),
        onBlockedEditAttempt: vi.fn(),
        setShowPopover: vi.fn(),
        setRangeSelectionRef: { current: vi.fn() },
      });
      setDraggedClip = hook.setDraggedClip;
      return null;
    }

    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    act(() => {
      root.render(<Harness />);
    });
    if (!setDraggedClip) throw new Error("Expected drag setter");
    const applyDraggedClip: (state: DraggedClipState | null) => void = setDraggedClip;

    act(() => {
      applyDraggedClip({
        element: back,
        originClientX: 0,
        originClientY: 0,
        originScrollLeft: 0,
        originScrollTop: 0,
        pointerClientX: 0,
        pointerClientY: 0,
        pointerOffsetX: 0,
        pointerOffsetY: 0,
        previewStart: back.start,
        previewTrack: back.track,
        previewLayerId: layers[2]!.id,
        previewLayerIndex: 2,
        previewStackingReorder: null,
        snapBeatTime: null,
        started: false,
      });
    });

    act(() => {
      window.dispatchEvent(
        new MouseEvent("pointermove", {
          bubbles: true,
          clientX: 0,
          clientY: -2 * TRACK_H,
        }),
      );
    });
    await act(async () => {
      window.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
    });

    expect(onMoveElement).toHaveBeenCalledTimes(1);
    expect(onMoveElement.mock.calls[0]![1]).toMatchObject({
      start: 0,
      track: 2,
      stackingReorder: {
        contextKey: "root",
        placement: { type: "onto", layerId: layers[0]!.id },
        zIndexChanges: [{ key: "back", zIndex: 3 }],
      },
    });

    act(() => root.unmount());
  });
});
