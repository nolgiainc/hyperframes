import { type TimelineElement } from "../store/playerStore";
import { resolveContextOrder, resolveStackingContextKey } from "../lib/layerOrdering";
import { getTimelineElementIdentity } from "../lib/timelineElementHelpers";
import { toStackingOrderItem, type TimelineStackingOrderItem } from "./timelineStacking";

export type TimelineLayerId = string;

export interface StackingTimelineLayer {
  id: TimelineLayerId;
  kind: "visual" | "audio";
  contextKey: string;
  zIndex: number;
  placementTrack: number;
  elements: TimelineElement[];
}

export interface StackingTimelineLayerGroups {
  visualLayers: StackingTimelineLayer[];
  audioLayers: StackingTimelineLayer[];
  rows: StackingTimelineLayer[];
}

type TimelineLayerOrderItem = TimelineStackingOrderItem & {
  start: number;
  duration: number;
  index: number;
  hasExplicitZIndex: boolean;
  element: TimelineElement;
};

type BuildLayer = StackingTimelineLayer & {
  hasExplicitZIndex: boolean;
};

function toTimelineLayerOrderItem(element: TimelineElement, index: number): TimelineLayerOrderItem {
  return {
    ...toStackingOrderItem(element),
    start: element.start,
    duration: element.duration,
    index,
    hasExplicitZIndex: element.hasExplicitZIndex === true,
    element,
  };
}

function timelineElementsOverlap(
  a: Pick<TimelineElement, "start" | "duration">,
  b: Pick<TimelineElement, "start" | "duration">,
): boolean {
  return a.start < b.start + b.duration && b.start < a.start + a.duration;
}

function compareLayerItems(a: TimelineLayerOrderItem, b: TimelineLayerOrderItem): number {
  if (a.zIndex !== b.zIndex) return b.zIndex - a.zIndex;
  if (a.hasExplicitZIndex && b.hasExplicitZIndex && a.track !== b.track) {
    return a.track - b.track;
  }
  return a.index - b.index;
}

function buildLayerId(
  prefix: string,
  contextKey: string,
  element: TimelineElement,
): TimelineLayerId {
  return `${prefix}:${contextKey}:${getTimelineElementIdentity(element)}`;
}

function getOrderedContextKeys(items: readonly TimelineLayerOrderItem[]): string[] {
  const keys: string[] = [];
  for (const item of resolveContextOrder(items)) {
    const key = resolveStackingContextKey(item);
    if (!keys.includes(key)) keys.push(key);
  }
  return keys;
}

function canJoinLayer(layer: BuildLayer, item: TimelineLayerOrderItem): boolean {
  return (
    layer.hasExplicitZIndex &&
    item.hasExplicitZIndex &&
    layer.contextKey === resolveStackingContextKey(item) &&
    layer.zIndex === item.zIndex &&
    layer.elements.every((element) => !timelineElementsOverlap(element, item.element))
  );
}

function buildVisualLayerRows(items: readonly TimelineLayerOrderItem[]): StackingTimelineLayer[] {
  const byContext = new Map<string, TimelineLayerOrderItem[]>();
  for (const item of items) {
    const key = resolveStackingContextKey(item);
    const list = byContext.get(key);
    if (list) list.push(item);
    else byContext.set(key, [item]);
  }

  const rows: StackingTimelineLayer[] = [];
  for (const contextKey of getOrderedContextKeys(items)) {
    const contextRows: BuildLayer[] = [];
    const contextItems = [...(byContext.get(contextKey) ?? [])].sort(compareLayerItems);
    for (const item of contextItems) {
      if (!item.hasExplicitZIndex) {
        contextRows.push({
          id: buildLayerId("auto", contextKey, item.element),
          kind: "visual",
          contextKey,
          zIndex: item.zIndex,
          placementTrack: item.element.track,
          elements: [item.element],
          hasExplicitZIndex: false,
        });
        continue;
      }

      const existing = contextRows.find((row) => canJoinLayer(row, item));
      if (existing) {
        existing.elements.push(item.element);
        continue;
      }
      contextRows.push({
        id: buildLayerId("layer", contextKey, item.element),
        kind: "visual",
        contextKey,
        zIndex: item.zIndex,
        placementTrack: item.element.track,
        elements: [item.element],
        hasExplicitZIndex: true,
      });
    }
    rows.push(...contextRows);
  }
  return rows;
}

function buildAudioLayerRows(items: readonly TimelineLayerOrderItem[]): StackingTimelineLayer[] {
  return items.map((item) => ({
    id: buildLayerId("audio", resolveStackingContextKey(item), item.element),
    kind: "audio",
    contextKey: resolveStackingContextKey(item),
    zIndex: item.zIndex,
    placementTrack: item.element.track,
    elements: [item.element],
  }));
}

export function buildStackingTimelineLayers(
  elements: readonly TimelineElement[],
): StackingTimelineLayerGroups {
  const items = elements.map(toTimelineLayerOrderItem);
  const visualItems = items.filter((item) => item.element.tag !== "audio");
  const audioItems = items.filter((item) => item.element.tag === "audio");
  const visualLayers = buildVisualLayerRows(visualItems);
  const audioLayers = buildAudioLayerRows(audioItems);
  return {
    visualLayers,
    audioLayers,
    rows: [...visualLayers, ...audioLayers],
  };
}

export function insertPreviewTrackOrder(
  layerOrder: readonly TimelineLayerId[],
  previewLayerId: TimelineLayerId,
  previewIndex: number,
): TimelineLayerId[] {
  if (layerOrder.includes(previewLayerId)) return [...layerOrder];
  const index = Math.max(0, Math.min(layerOrder.length, Math.round(previewIndex)));
  return [...layerOrder.slice(0, index), previewLayerId, ...layerOrder.slice(index)];
}
