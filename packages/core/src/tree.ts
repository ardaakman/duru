import * as dagre from "@dagrejs/dagre";
import type { GraphModel, Node, Edge } from "./types.js";
import { healthCapable } from "./health.js";
import type { Health } from "./types.js";

export type Forest = {
  byId: Map<string, Node>;
  childrenOf: Map<string, string[]>;
  roots: string[];
  ownEdges: Edge[];
};

const GROUP = (g: string) => `group:${g}`;

export function buildForest(model: GraphModel): Forest {
  const byId = new Map<string, Node>();
  for (const g of model.groups) {
    const id = GROUP(g.id);
    byId.set(id, {
      id, kind: "Namespace", name: g.label === "cluster-scoped" ? "cluster" : g.label,
      ns: "", group: g.id, icon: "", accent: "#8f8f8f", tier: 0, summary: "Namespace", health: "unknown",
    });
  }
  const real = model.nodes.filter((n) => n.kind !== "Namespace");
  for (const n of real) byId.set(n.id, n);

  const childrenOf = new Map<string, string[]>();
  for (const n of real) {
    const parent = n.parentId && byId.has(n.parentId) ? n.parentId : GROUP(n.group);
    const arr = childrenOf.get(parent) ?? [];
    arr.push(n.id); childrenOf.set(parent, arr);
  }
  // App-aware deterministic ordering: same-app siblings become adjacent (spec §3.1).
  const appKey = (id: string) => { const n = byId.get(id)!; return n.labels?.["app.kubernetes.io/name"] ?? n.labels?.["app"] ?? n.name; };
  for (const arr of childrenOf.values()) {
    arr.sort((a, b) => {
      const na = byId.get(a)!, nb = byId.get(b)!;
      return appKey(a).localeCompare(appKey(b)) || na.tier - nb.tier || na.kind.localeCompare(nb.kind) || na.name.localeCompare(nb.name);
    });
  }
  const ownEdges: Edge[] = [];
  for (const [p, cs] of childrenOf) for (const c of cs) ownEdges.push({ id: `own:${p}->${c}`, source: p, target: c, type: "owns", label: "" });
  const roots = model.groups.map((g) => GROUP(g.id)).filter((id) => (childrenOf.get(id)?.length ?? 0) > 0);
  return { byId, childrenOf, roots, ownEdges };
}

export function visibleIds(f: Forest, collapsed: Set<string>, root: string | null): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const stack = root ? [root] : [...f.roots];
  while (stack.length) {
    const id = stack.shift()!;
    if (seen.has(id)) continue;
    seen.add(id); out.push(id);
    if (collapsed.has(id)) continue;
    for (const c of f.childrenOf.get(id) ?? []) stack.push(c);
  }
  return out;
}

export function layout(f: Forest, ids: string[]): Map<string, { x: number; y: number }> {
  const vis = new Set(ids);
  const g = new (dagre as any).graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 12, ranksep: 70, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const id of ids) g.setNode(id, { width: 212, height: 52 });
  for (const e of f.ownEdges) if (vis.has(e.source) && vis.has(e.target)) g.setEdge(e.source, e.target);
  (dagre as any).layout(g);
  const pos = new Map<string, { x: number; y: number }>();
  for (const id of ids) { const n = g.node(id); pos.set(id, { x: n.x - 106, y: n.y - 26 }); }
  return pos;
}

export function childCount(f: Forest, id: string): number { return f.childrenOf.get(id)?.length ?? 0; }

export function pathTo(f: Forest, id: string): string[] {
  const parentById = new Map<string, string>();
  for (const [p, cs] of f.childrenOf) for (const c of cs) parentById.set(c, p);
  const chain: string[] = [];
  const seen = new Set<string>();               // guard against a parentId cycle in malformed dumps
  let cur: string | undefined = id;
  while (cur && !seen.has(cur)) { seen.add(cur); chain.unshift(cur); cur = parentById.get(cur); }
  return chain;
}

export type Rollup = { worst: Health; hasUnobserved: boolean };
const RANK: Record<string, number> = { error: 3, warn: 2, ok: 1 };

// §1.2: rollup over HEALTH-CAPABLE subtree members only. `unknown` = unobserved,
// never a downgrade vote; it surfaces as hasUnobserved (ring) instead.
export function rollupHealth(f: Forest): Map<string, Rollup> {
  const out = new Map<string, Rollup>();
  const walk = (id: string): { max: number; observed: number; unobserved: number } => {
    const n = f.byId.get(id)!;
    let max = 0, observed = 0, unobserved = 0;
    if (healthCapable(n.kind)) {
      const h = n.health ?? "unknown";
      if (h === "unknown") unobserved++;
      else { observed++; max = RANK[h] ?? 0; }
    }
    for (const c of f.childrenOf.get(id) ?? []) {
      const r = walk(c);
      max = Math.max(max, r.max); observed += r.observed; unobserved += r.unobserved;
    }
    const worst: Health = max === 3 ? "error" : max === 2 ? "warn" : max === 1 ? "ok" : "unknown";
    out.set(id, { worst, hasUnobserved: unobserved > 0 && observed > 0 });
    return { max, observed, unobserved };
  };
  for (const r of f.roots) walk(r);
  return out;
}
