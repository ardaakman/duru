import { test, expect } from "vitest";
import { buildForest, rollupHealth, visibleIds } from "./tree.js";
import { applyFilters, emptyFilters, filtersActive, subtreeHasKind } from "./filter.js";
import type { GraphModel } from "./types.js";

const N = (id: string, kind: string, over: any = {}) =>
  ({ id, kind, name: id, ns: "web", group: "web", icon: "", accent: "", tier: 2, summary: kind, health: "ok", ...over });

// web: dep->rs->pod(ok)+podX(error) , cm ; api: dep2->rs2->pod2(ok)
const m: GraphModel = {
  nodes: [
    N("dep", "Deployment"), N("rs", "ReplicaSet", { parentId: "dep" }),
    N("pod", "Pod", { parentId: "rs" }), N("podX", "Pod", { parentId: "rs", health: "error" }),
    N("cm", "ConfigMap", { health: "unknown" }),
    N("dep2", "Deployment", { ns: "api", group: "api" }),
    N("rs2", "ReplicaSet", { ns: "api", group: "api", parentId: "dep2" }),
    N("pod2", "Pod", { ns: "api", group: "api", parentId: "rs2" }),
  ],
  edges: [], groups: [{ id: "web", label: "web" }, { id: "api", label: "api" }], warnings: [],
};
const f = buildForest(m);
const r = rollupHealth(f);
const all = visibleIds(f, new Set(), null);

test("empty filters are inactive and change nothing", () => {
  expect(filtersActive(emptyFilters())).toBe(false);
  expect(applyFilters(f, r, all, emptyFilters())).toEqual(all);
});

test("namespace scoping keeps only that group's subtree (incl. its root)", () => {
  const out = new Set(applyFilters(f, r, all, { ...emptyFilters(), namespaces: new Set(["api"]) }));
  expect(out).toEqual(new Set(["group:api", "dep2", "rs2", "pod2"]));
});

test("kind filter retains ancestor spines above matches", () => {
  const out = new Set(applyFilters(f, r, all, { ...emptyFilters(), kinds: new Set(["Pod"]) }));
  for (const want of ["group:web", "dep", "rs", "pod", "podX", "group:api", "dep2", "rs2", "pod2"]) expect(out.has(want), want).toBe(true);
  expect(out.has("cm")).toBe(false);
});

test("problemsOnly keeps warn/error spines, prunes green and unknown", () => {
  const out = new Set(applyFilters(f, r, all, { ...emptyFilters(), problemsOnly: true }));
  expect(out).toEqual(new Set(["group:web", "dep", "rs", "podX"])); // pod(ok), cm(unknown), api subtree all pruned
});

test("dimensions AND together", () => {
  const out = applyFilters(f, r, all, { namespaces: new Set(["api"]), kinds: new Set(["Pod"]), problemsOnly: true });
  expect(out).toEqual([]); // api has no problems
});

test("subtreeHasKind marks ancestors and matches, not unrelated siblings", () => {
  const s = subtreeHasKind(f, new Set(["Pod"]));
  expect(s.has("dep")).toBe(true);
  expect(s.has("group:web")).toBe(true);
  expect(s.has("cm")).toBe(false);
});
