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

test("direct only: pod focus = chain + its own refs; NO ingress/storageclass/siblings", () => {
  const m = world(2);
  const r = focusSet(m, buildForest(m), "pod");
  expect(new Set(r.ids)).toEqual(new Set(["group:x", "dep", "rs", "pod", "sec", "sa", "svc", "pvc"]));
  expect(r.more).toEqual([]);
  expect(r.truncated).toBe(false);
});

test("svc focus pulls ITS directs (selected pod, routing ingress) — not the pod's refs", () => {
  const m = world(0);
  const r = focusSet(m, buildForest(m), "svc");
  expect(new Set(r.ids)).toEqual(new Set(["group:x", "svc", "pod", "ing"]));
});

test("per-group cap on the anchor's own edges → one '+N more Pods' anchored to the FOCUS node", () => {
  const m = world(20); // sec is mounted by pod + 20 siblings = 21 direct Pods
  const r = focusSet(m, buildForest(m), "sec", { capPerGroup: 12 });
  expect(r.ids.filter((i) => i === "pod" || i.startsWith("sib")).length).toBe(12);
  expect(r.more).toEqual([{ id: "more:sec:mounts:Pod", label: "+9 more Pods", anchorId: "sec" }]);
  expect(r.truncated).toBe(false); // group cap alone is not "truncated"
});

test("owns edges never traversed: sec focus excludes rs/dep despite owns edges to its pods", () => {
  const m = world(2);
  const s = new Set(focusSet(m, buildForest(m), "sec").ids);
  expect(s.has("rs")).toBe(false);
  expect(s.has("dep")).toBe(false);
});

test("capTotal cuts a direct group and sets truncated", () => {
  const m = world(20);
  const r = focusSet(m, buildForest(m), "sec", { capPerGroup: 50, capTotal: 6 });
  expect(r.truncated).toBe(true);
  expect(r.ids.length).toBeLessThanOrEqual(6);
  expect(r.more[0].label).toBe("+17 more Pods"); // 21 members, 4 taken (6 - chain of 2)
});

test("RS focus includes child pods; isolated anchor = chain only; unknown anchor = empty", () => {
  const m = world(1);
  const f = buildForest(m);
  const rs = focusSet(m, f, "rs");
  expect(rs.ids.includes("pod")).toBe(true);
  expect(rs.ids.includes("sib0")).toBe(true);
  const lonelyModel: GraphModel = { nodes: [N("lonely", "ConfigMap")], edges: [], groups: [{ id: "x", label: "x" }], warnings: [] };
  const lone = focusSet(lonelyModel, buildForest(lonelyModel), "lonely");
  expect(new Set(lone.ids)).toEqual(new Set(["group:x", "lonely"]));
  expect(focusSet(m, f, "nope").ids).toEqual([]);
});
