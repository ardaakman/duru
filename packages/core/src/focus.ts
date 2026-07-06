import type { GraphModel } from "./types.js";
import type { Forest } from "./tree.js";
import { pathTo } from "./tree.js";

export interface FocusMore { id: string; label: string; anchorId: string }
export interface FocusResult { ids: string[]; more: FocusMore[]; truncated: boolean }
export interface FocusOpts { capPerGroup?: number; capTotal?: number }

// Spec §2 (v1.1): DIRECT connections only — anchor + owner chain (context) +
// direct children + the anchor's OWN non-owns neighbors, grouped by
// (edge type, neighbor kind) and capped; overflow per group becomes ONE
// synthetic "+N more <Kind>s" placeholder anchored to the focus node.
export function focusSet(model: GraphModel, forest: Forest, anchorId: string, opts: FocusOpts = {}): FocusResult {
  const capPerGroup = opts.capPerGroup ?? 12;
  const capTotal = opts.capTotal ?? 120;
  const more: FocusMore[] = [];
  let truncated = false;
  if (!forest.byId.has(anchorId)) return { ids: [], more, truncated };

  const ids = new Set<string>(pathTo(forest, anchorId));            // anchor + chain up
  for (const c of forest.childrenOf.get(anchorId) ?? []) ids.add(c); // direct children

  // the anchor's own non-owns edges, grouped by (type, neighbor kind)
  const groups = new Map<string, Set<string>>();
  for (const e of model.edges) {
    if (e.type === "owns") continue;
    if (e.source !== anchorId && e.target !== anchorId) continue;
    const other = e.source === anchorId ? e.target : e.source;
    if (ids.has(other) || !forest.byId.has(other)) continue;
    const key = e.type + "|" + forest.byId.get(other)!.kind;
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key)!.add(other);
  }
  for (const [key, memberSet] of groups) {
    const members = [...memberSet].filter((m) => !ids.has(m)); // may have been added via another group
    if (!members.length) continue;
    const [type, kind] = key.split("|");
    const room = capTotal - ids.size;
    if (room <= 0) { truncated = true; continue; }
    const take = Math.min(capPerGroup, members.length, room);
    for (let i = 0; i < take; i++) ids.add(members[i]);
    if (take < members.length) {
      const plural = kind + (kind.endsWith("s") ? "es" : "s"); // Pods, Ingresses, StorageClasses
      more.push({ id: `more:${anchorId}:${type}:${kind}`, label: `+${members.length - take} more ${plural}`, anchorId });
      if (take < Math.min(capPerGroup, members.length)) truncated = true; // cut by capTotal, not just group cap
    }
  }
  return { ids: [...ids], more, truncated };
}
