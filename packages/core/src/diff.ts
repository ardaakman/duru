import type { GraphModel, Health } from "./types.js";

export interface ModelDiff {
  healthPatches: Map<string, Health>;
  topologyChanged: boolean;
  changeCount: number;
}

// Spec §6: health patches apply live to SURVIVING nodes even when topology changed
// elsewhere; structure (add/remove/reparent/groups/edges/metadata) gates behind the pill.
export function diffModels(prev: GraphModel, next: GraphModel): ModelDiff {
  const prevById = new Map(prev.nodes.map((n) => [n.id, n]));
  const nextIds = new Set(next.nodes.map((n) => n.id));
  const healthPatches = new Map<string, Health>();
  let topologyChanged = false;
  let changeCount = 0;

  for (const n of next.nodes) {
    const p = prevById.get(n.id);
    if (!p) { topologyChanged = true; changeCount++; continue; }         // added
    if (p.parentId !== n.parentId) { topologyChanged = true; changeCount++; }
    if ((p.health ?? "unknown") !== (n.health ?? "unknown")) healthPatches.set(n.id, (n.health ?? "unknown") as Health);
    // Metadata-only changes are conservatively topology (spec §6): stale-until-refresh.
    if (p.count !== n.count || p.nodeName !== n.nodeName || p.summary !== n.summary || p.name !== n.name) topologyChanged = true;
  }
  for (const p of prev.nodes) if (!nextIds.has(p.id)) { topologyChanged = true; changeCount++; }  // removed

  if (!topologyChanged) {
    const groupKey = (m: GraphModel) => m.groups.map((g) => g.id).sort().join("|");
    if (groupKey(prev) !== groupKey(next)) topologyChanged = true;
  }
  if (!topologyChanged) {
    const edgeKey = (m: GraphModel) => m.edges.map((e) => e.id).sort().join("|");
    if (edgeKey(prev) !== edgeKey(next)) topologyChanged = true;         // harmless re-layout, needed for trace/inspector
  }
  if (topologyChanged && changeCount === 0) changeCount = 1;
  return { healthPatches, topologyChanged, changeCount };
}
