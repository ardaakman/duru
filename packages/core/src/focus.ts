import type { GraphModel, Edge } from "./types.js";
import type { Forest } from "./tree.js";
import { pathTo } from "./tree.js";

export interface FocusMore { id: string; label: string; anchorId: string }
export interface FocusResult { ids: string[]; more: FocusMore[]; truncated: boolean }
export interface FocusOpts { capPerGroup?: number; capTotal?: number }

// Spec §2: anchor + owner chain + direct children + full 1-hop (never truncated)
// + capped 2-hop over non-owns edges. Overflow per (hop-1 node, edge type, kind)
// group becomes ONE synthetic "+N more <Kind>s" placeholder.
export function focusSet(model: GraphModel, forest: Forest, anchorId: string, opts: FocusOpts = {}): FocusResult {
  const capPerGroup = opts.capPerGroup ?? 12;
  const capTotal = opts.capTotal ?? 120;
  const more: FocusMore[] = [];
  let truncated = false;
  if (!forest.byId.has(anchorId)) return { ids: [], more, truncated };

  const ids = new Set<string>(pathTo(forest, anchorId));            // anchor + chain up
  for (const c of forest.childrenOf.get(anchorId) ?? []) ids.add(c); // direct children

  const adj = new Map<string, Edge[]>();
  for (const e of model.edges) {
    if (e.type === "owns") continue;
    if (!adj.has(e.source)) adj.set(e.source, []);
    if (!adj.has(e.target)) adj.set(e.target, []);
    adj.get(e.source)!.push(e); adj.get(e.target)!.push(e);
  }
  const neighborsOf = (id: string): string[] => {
    const out = new Set<string>();
    for (const e of adj.get(id) ?? []) {
      const other = e.source === id ? e.target : e.source;
      if (forest.byId.has(other)) out.add(other);
    }
    return [...out];
  };

  const hop1: string[] = [];
  for (const n of neighborsOf(anchorId)) if (!ids.has(n)) { ids.add(n); hop1.push(n); }

  for (const h of hop1) {
    // group hop-2 candidates by (edge type, neighbor kind), dedup within group
    const groups = new Map<string, Set<string>>();
    for (const e of adj.get(h) ?? []) {
      const other = e.source === h ? e.target : e.source;
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
        more.push({ id: `more:${h}:${type}:${kind}`, label: `+${members.length - take} more ${plural}`, anchorId: h });
        if (take < Math.min(capPerGroup, members.length)) truncated = true; // cut by capTotal, not just group cap
      }
    }
  }
  return { ids: [...ids], more, truncated };
}
