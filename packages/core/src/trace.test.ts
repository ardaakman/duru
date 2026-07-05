import { test, expect } from "vitest";
import { traceEdges } from "./trace.js";
import type { GraphModel } from "./types.js";

const model: GraphModel = {
  nodes: [], groups: [], warnings: [],
  edges: [
    { id: "e1", source: "svc", target: "p1", type: "selects", label: "selects" },
    { id: "e2", source: "svc", target: "p2", type: "selects", label: "selects" },
    { id: "e3", source: "ing", target: "svc", type: "routes", label: "routes" },
    { id: "e4", source: "dep", target: "cm", type: "mounts", label: "mounts" },
    { id: "e5", source: "own", target: "svc", type: "owns", label: "owns" },
  ],
};

test("traceEdges: only the selected node's non-owns edges, both endpoints visible", () => {
  const vis = new Set(["svc", "p1", "ing"]);                  // p2 hidden
  const t = traceEdges(model, "svc", vis);
  expect(t.edges.map((e) => e.id).sort()).toEqual(["e1", "e3"]); // e2 hidden target, e4 not svc's, e5 owns
  expect(t.types.sort()).toEqual(["routes", "selects"]);
  expect(traceEdges(model, null, vis).edges).toEqual([]);
});
