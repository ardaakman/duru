import { test, expect } from "vitest";
import { buildForest, visibleIds, childCount, pathTo, rollupHealth } from "./tree.js";
import type { GraphModel } from "./types.js";

const model: GraphModel = {
  nodes: [
    { id: "dep", kind: "Deployment", name: "web", ns: "shop", group: "shop", icon: "", accent: "", tier: 2, summary: "Deployment" },
    { id: "rs", kind: "ReplicaSet", name: "web-1", ns: "shop", group: "shop", icon: "", accent: "", tier: 2, summary: "ReplicaSet", parentId: "dep" },
    { id: "p1", kind: "Pod", name: "web-1-a", ns: "shop", group: "shop", icon: "", accent: "", tier: 2, summary: "Pod", parentId: "rs" },
    { id: "cm", kind: "ConfigMap", name: "cfg", ns: "shop", group: "shop", icon: "", accent: "", tier: 3, summary: "ConfigMap" },
  ],
  edges: [], groups: [{ id: "shop", label: "shop" }], warnings: [],
};

test("buildForest: synthetic group root parents workloads and standalone objects", () => {
  const f = buildForest(model);
  expect(f.roots).toEqual(["group:shop"]);
  expect(f.childrenOf.get("group:shop")!.sort()).toEqual(["cm", "dep"]);
  expect(f.childrenOf.get("dep")).toEqual(["rs"]);
  expect(f.childrenOf.get("rs")).toEqual(["p1"]);
  expect(f.byId.get("group:shop")!.name).toBe("shop");
});

test("visibleIds: collapsing a node hides its subtree; drill root shows only its subtree", () => {
  const f = buildForest(model);
  expect(new Set(visibleIds(f, new Set(), null))).toEqual(new Set(["group:shop", "dep", "rs", "p1", "cm"]));
  expect(new Set(visibleIds(f, new Set(["rs"]), null))).toEqual(new Set(["group:shop", "dep", "rs", "cm"])); // p1 hidden
  expect(new Set(visibleIds(f, new Set(), "dep"))).toEqual(new Set(["dep", "rs", "p1"])); // drilled into dep
});

test("childCount and pathTo", () => {
  const f = buildForest(model);
  expect(childCount(f, "dep")).toBe(1);
  expect(childCount(f, "p1")).toBe(0);
  expect(pathTo(f, "p1")).toEqual(["group:shop", "dep", "rs", "p1"]);
});

test("pathTo terminates on a parentId cycle (malformed dump)", () => {
  const cyc: GraphModel = {
    nodes: [
      { id: "A", kind: "Pod", name: "a", ns: "x", group: "x", icon: "", accent: "", tier: 2, summary: "Pod", parentId: "B" },
      { id: "B", kind: "Pod", name: "b", ns: "x", group: "x", icon: "", accent: "", tier: 2, summary: "Pod", parentId: "A" },
    ],
    edges: [], groups: [{ id: "x", label: "x" }], warnings: [],
  };
  const f = buildForest(cyc);
  const path = pathTo(f, "A");
  expect(path.length).toBeLessThanOrEqual(2);   // terminates, no infinite loop
  expect(path).toContain("A");
});

const N = (id: string, kind: string, over: any = {}) =>
  ({ id, kind, name: id, ns: "x", group: "x", icon: "", accent: "", tier: 2, summary: kind, ...over });

test("rollupHealth: worst observed wins; non-voters excluded; unknown only when nothing observed", () => {
  const m: GraphModel = {
    nodes: [
      N("dep", "Deployment", { health: "ok" }),
      N("rs", "ReplicaSet", { parentId: "dep", health: "ok" }),
      N("p1", "Pod", { parentId: "rs", health: "ok" }),
      N("p2", "Pod", { parentId: "rs", health: "error" }),
      N("cm", "ConfigMap", { health: "unknown" }),           // non-voter
    ],
    edges: [], groups: [{ id: "x", label: "x" }], warnings: [],
  };
  const f = buildForest(m);
  const r = rollupHealth(f);
  expect(r.get("rs")!.worst).toBe("error");                   // crashing pod bubbles up
  expect(r.get("dep")!.worst).toBe("error");
  expect(r.get("group:x")!.worst).toBe("error");              // through the namespace root
  expect(r.get("rs")!.hasUnobserved).toBe(false);             // all capable members observed
  const onlyCm: GraphModel = { nodes: [N("cm2", "ConfigMap", { health: "unknown" })], edges: [], groups: [{ id: "x", label: "x" }], warnings: [] };
  expect(rollupHealth(buildForest(onlyCm)).get("group:x")!.worst).toBe("unknown"); // zero voters → unknown
});

test("rollupHealth: ok + unobserved capable member → hasUnobserved (green needs the ring)", () => {
  const m: GraphModel = {
    nodes: [
      N("rs", "ReplicaSet", { health: "ok" }),
      N("p1", "Pod", { parentId: "rs", health: "ok" }),
      N("p2", "Pod", { parentId: "rs", health: "unknown" }),  // capable but unobserved
    ],
    edges: [], groups: [{ id: "x", label: "x" }], warnings: [],
  };
  const r = rollupHealth(buildForest(m));
  expect(r.get("rs")!.worst).toBe("ok");
  expect(r.get("rs")!.hasUnobserved).toBe(true);
});

test("buildForest sorts siblings by app label then name (same-app rows adjacent)", () => {
  const m: GraphModel = {
    nodes: [
      N("svc-b", "Service", { name: "beta", labels: { app: "beta" }, tier: 1 }),
      N("dep-a", "Deployment", { name: "alpha", labels: { app: "alpha" } }),
      N("svc-a", "Service", { name: "alpha", labels: { app: "alpha" }, tier: 1 }),
      N("dep-b", "Deployment", { name: "beta", labels: { app: "beta" } }),
    ],
    edges: [], groups: [{ id: "x", label: "x" }], warnings: [],
  };
  const f = buildForest(m);
  const order = f.childrenOf.get("group:x")!;
  expect(order.indexOf("dep-a")).toBeLessThan(order.indexOf("svc-b"));   // all alpha before any beta
  expect(order.indexOf("svc-a")).toBeLessThan(order.indexOf("dep-b"));
  expect(Math.abs(order.indexOf("dep-a") - order.indexOf("svc-a"))).toBe(1); // alpha rows adjacent
});
