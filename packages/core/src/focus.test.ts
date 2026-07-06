import { test, expect } from "vitest";
import { buildForest } from "./tree.js";
import { focusSet } from "./focus.js";
import type { GraphModel } from "./types.js";

const N = (id: string, kind: string, over: any = {}) =>
  ({ id, kind, name: id, ns: "x", group: "x", icon: "", accent: "", tier: 2, summary: kind, ...over });
const E = (id: string, source: string, target: string, type: any) => ({ id, source, target, type, label: type });

// dep -> rs -> pod ; pod mounts sec + uses sa ; svc selects pod ; ing routes svc ;
// pvc mounted by pod, pvc -> class sc ; sibling pods share sec.
function world(siblings = 2): GraphModel {
  const nodes = [
    N("dep", "Deployment"), N("rs", "ReplicaSet", { parentId: "dep" }), N("pod", "Pod", { parentId: "rs" }),
    N("sec", "Secret"), N("sa", "ServiceAccount"), N("svc", "Service"), N("ing", "Ingress"),
    N("pvc", "PersistentVolumeClaim"), N("sc", "StorageClass", { group: "cluster-scoped" }),
  ];
  const edges = [
    // REAL owns edges present so the traversal's owns-exclusion is actually exercised
    E("o1", "dep", "rs", "owns"), E("o2", "rs", "pod", "owns"),
    E("e1", "pod", "sec", "mounts"), E("e2", "pod", "sa", "uses"), E("e3", "svc", "pod", "selects"),
    E("e4", "ing", "svc", "routes"), E("e5", "pod", "pvc", "mounts"), E("e6", "pvc", "sc", "class"),
  ];
  for (let i = 0; i < siblings; i++) {
    nodes.push(N("sib" + i, "Pod", { parentId: "rs" }));
    edges.push(E("os" + i, "rs", "sib" + i, "owns"));
    edges.push(E("es" + i, "sib" + i, "sec", "mounts"));
  }
  return { nodes, edges, groups: [{ id: "x", label: "x" }, { id: "cluster-scoped", label: "cluster-scoped" }], warnings: [] };
}

test("2-hop: chain up, hop-1 refs, ingress behind service, class behind pvc, siblings via shared secret", () => {
  const m = world(2);
  const r = focusSet(m, buildForest(m), "pod");
  const s = new Set(r.ids);
  for (const want of ["group:x", "dep", "rs", "pod", "sec", "sa", "svc", "pvc", "ing", "sc", "sib0", "sib1"])
    expect(s.has(want), want).toBe(true);
  expect(r.more).toEqual([]);
  expect(r.truncated).toBe(false);
});

test("per-group cap → one synthetic '+N more Pods' card on the shared secret", () => {
  const m = world(20); // 20 siblings all mounting sec
  const r = focusSet(m, buildForest(m), "pod", { capPerGroup: 12 });
  const s = new Set(r.ids);
  const sibs = r.ids.filter((i) => i.startsWith("sib"));
  expect(sibs.length).toBe(12);
  expect(r.more).toHaveLength(1);
  expect(r.more[0]).toEqual({ id: "more:sec:mounts:Pod", label: "+8 more Pods", anchorId: "sec" });
  expect(r.truncated).toBe(false); // ordinary group overflow is NOT "truncated" (that's capTotal's flag)
  expect(s.has("ing")).toBe(true); // other groups unaffected
});

test("owns edges are never traversed: focusing the secret pulls pods (mounts) but NOT rs/dep", () => {
  const m = world(2);
  const r = focusSet(m, buildForest(m), "sec");
  const s = new Set(r.ids);
  expect(s.has("pod")).toBe(true);           // hop-1 via mounts
  expect(s.has("rs")).toBe(false);           // reachable ONLY via owns — must be excluded
  expect(s.has("dep")).toBe(false);
});

test("anchor with zero non-owns edges → chain only, no crash", () => {
  const m: GraphModel = {
    nodes: [N("lonely", "ConfigMap")], edges: [],
    groups: [{ id: "x", label: "x" }], warnings: [],
  };
  const r = focusSet(m, buildForest(m), "lonely");
  expect(new Set(r.ids)).toEqual(new Set(["group:x", "lonely"]));
  expect(r.more).toEqual([]);
  expect(r.truncated).toBe(false);
});

test("capTotal stops hop-2 growth and sets truncated; hop-1 + chain never cut", () => {
  const m = world(50);
  const r = focusSet(m, buildForest(m), "pod", { capPerGroup: 50, capTotal: 15 });
  expect(r.truncated).toBe(true);
  for (const want of ["group:x", "dep", "rs", "pod", "sec", "sa", "svc", "pvc"]) // chain + hop-1 intact
    expect(r.ids.includes(want), want).toBe(true);
  expect(r.ids.length).toBeLessThanOrEqual(15);
});

test("focusing an RS includes its child pods; unknown anchor → empty", () => {
  const m = world(1);
  const r = focusSet(m, buildForest(m), "rs");
  expect(r.ids.includes("pod")).toBe(true);
  expect(r.ids.includes("sib0")).toBe(true);
  expect(focusSet(m, buildForest(m), "nope").ids).toEqual([]);
});
