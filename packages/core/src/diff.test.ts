import { test, expect } from "vitest";
import { diffModels } from "./diff.js";
import type { GraphModel } from "./types.js";

const N = (id: string, over: any = {}) =>
  ({ id, kind: "Pod", name: id, ns: "x", group: "x", icon: "", accent: "", tier: 2, summary: "Pod", health: "ok", ...over });
const M = (nodes: any[], edges: any[] = []): GraphModel =>
  ({ nodes, edges, groups: [{ id: "x", label: "x" }], warnings: [] });

test("health-only change → patch, no topology", () => {
  const d = diffModels(M([N("a"), N("b")]), M([N("a", { health: "error" }), N("b")]));
  expect(d.healthPatches.get("a")).toBe("error");
  expect(d.topologyChanged).toBe(false);
  expect(d.changeCount).toBe(0);
});

test("surviving nodes still get health patches when topology changed elsewhere", () => {
  const d = diffModels(M([N("a"), N("b")]), M([N("a", { health: "warn" }), N("c")])); // b removed, c added
  expect(d.healthPatches.get("a")).toBe("warn");   // survivor patched despite churn
  expect(d.topologyChanged).toBe(true);
  expect(d.changeCount).toBe(2);                    // 1 removed + 1 added
});

test("reparent, group change, edge change, metadata change → topology", () => {
  expect(diffModels(M([N("a"), N("b", { parentId: "a" })]), M([N("a"), N("b")])).topologyChanged).toBe(true);
  const g2 = M([N("a")]); g2.groups = [{ id: "y", label: "y" }];
  expect(diffModels(M([N("a")]), g2).topologyChanged).toBe(true);
  expect(diffModels(M([N("a")], []), M([N("a")], [{ id: "e", source: "a", target: "a2", type: "selects", label: "" }])).topologyChanged).toBe(true);
  expect(diffModels(M([N("a")]), M([N("a", { count: 3 })])).topologyChanged).toBe(true);
});

test("identical models → no-op diff", () => {
  const d = diffModels(M([N("a")]), M([N("a")]));
  expect(d.healthPatches.size).toBe(0);
  expect(d.topologyChanged).toBe(false);
  expect(d.changeCount).toBe(0);
});
