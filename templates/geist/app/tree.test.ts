import { test, expect } from "vitest";
import { buildForest, visibleIds, childCount, pathTo } from "./tree.js";
import type { GraphModel } from "../../../src/core/types.js";

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
