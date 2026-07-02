import dagre from "dagre";
import type { GraphModel, Node, Edge } from "../../../src/core/types.js";

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
  const ownEdges: Edge[] = [];
  const link = (p: string, c: string) => {
    const arr = childrenOf.get(p) ?? [];
    arr.push(c); childrenOf.set(p, arr);
    ownEdges.push({ id: `own:${p}->${c}`, source: p, target: c, type: "owns", label: "" });
  };
  for (const n of real) {
    const parent = n.parentId && byId.has(n.parentId) ? n.parentId : GROUP(n.group);
    link(parent, n.id);
  }
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
  let cur: string | undefined = id;
  while (cur) { chain.unshift(cur); cur = parentById.get(cur); }
  return chain;
}
