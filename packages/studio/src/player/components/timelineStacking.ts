import { getTimelineElementIdentity } from "../lib/timelineElementHelpers";

export interface TimelineStackingElement {
  id: string;
  key?: string;
  tag?: string;
  track: number;
  zIndex?: number;
  stackingContextId?: string | null;
  parentCompositionId?: string | null;
  compositionAncestors?: string[];
}

export interface TimelineStackingOrderItem {
  key: string;
  track: number;
  zIndex: number;
  stackingContextId: string | null;
  parentCompositionId: string | null;
  compositionAncestors: readonly string[];
}

export type TimelineLayerDropPlacement =
  | { type: "onto"; layerId: string }
  | { type: "between"; beforeLayerId: string; afterLayerId: string }
  | { type: "above"; layerId: string }
  | { type: "below"; layerId: string };

export interface TimelineStackingZIndexChange {
  key: string;
  zIndex: number;
}

export interface TimelineStackingReorderIntent {
  contextKey: string;
  placement: TimelineLayerDropPlacement;
  zIndexChanges: TimelineStackingZIndexChange[];
}

export function toStackingOrderItem(element: TimelineStackingElement): TimelineStackingOrderItem {
  return {
    key: getTimelineElementIdentity(element),
    track: element.track,
    zIndex: element.zIndex ?? 0,
    stackingContextId: element.stackingContextId ?? null,
    parentCompositionId: element.parentCompositionId ?? null,
    compositionAncestors: element.compositionAncestors ?? [],
  };
}
