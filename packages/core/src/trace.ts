import type { GraphModel, Edge } from "./types.js";

export const TRACE_COLORS: Record<string, string> = {
  selects: "#0070f3", routes: "#0070f3", mounts: "#f5a623", class: "#7928ca", uses: "#8f8f8f",
};

// §3.2: the selected node's non-ownership edges, only where both endpoints are
// visible. Hidden targets stay reachable via inspector chips (which reveal()).
export function traceEdges(model: GraphModel, selectedId: string | null, visible: Set<string>): { edges: Edge[]; types: string[] } {
  if (!selectedId) return { edges: [], types: [] };
  const edges = model.edges.filter((e) =>
    e.type !== "owns" && (e.source === selectedId || e.target === selectedId) && visible.has(e.source) && visible.has(e.target));
  return { edges, types: [...new Set(edges.map((e) => e.type))] };
}
