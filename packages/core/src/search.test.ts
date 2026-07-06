import { test, expect } from "vitest";
import { matchNodes } from "./search.js";
import type { Node } from "./types.js";

const N = (id: string, kind: string, over: any = {}): Node =>
  ({ id, kind, name: id, ns: "web", group: "web", icon: "", accent: "", tier: 2, summary: kind, ...over });

const nodes: Node[] = [
  N("storefront", "Deployment", { labels: { app: "storefront", team: "shop" } }),
  N("storefront-cfg", "ConfigMap"),
  N("checkout", "Deployment", { ns: "api", group: "api", labels: { app: "checkout" } }),
  N("db-token", "Secret", { labels: { rotation: "weekly" } }),
];

test("name substring match has empty why", () => {
  const r = matchNodes(nodes, "storef");
  expect(r.map((m) => m.node.id)).toEqual(["storefront", "storefront-cfg"]);
  expect(r[0].why).toBe("");
});

test("kind alias: 'cm' finds ConfigMaps, 'depl' finds Deployments", () => {
  expect(matchNodes(nodes, "cm").map((m) => m.node.id)).toEqual(["storefront-cfg"]);
  const d = matchNodes(nodes, "depl");
  expect(d.map((m) => m.node.id).sort()).toEqual(["checkout", "storefront"]);
  expect(d[0].why).toBe("kind");
});

test("label key, value, and key=value all match with label why", () => {
  expect(matchNodes(nodes, "rotation")[0].node.id).toBe("db-token");
  expect(matchNodes(nodes, "weekly")[0].node.id).toBe("db-token");
  const kv = matchNodes(nodes, "team=shop");
  expect(kv[0].node.id).toBe("storefront");
  expect(kv[0].why).toBe("label team=shop");
});

test("namespace matches with ns why; multi-token ANDs across fields", () => {
  const r = matchNodes(nodes, "api");
  expect(r[0].node.id).toBe("checkout");
  expect(r[0].why).toBe("ns api");
  expect(matchNodes(nodes, "depl api").map((m) => m.node.id)).toEqual(["checkout"]);
  expect(matchNodes(nodes, "depl nosuch")).toEqual([]);
});

test("multi-token with a name hit keeps empty why (contract lock)", () => {
  const r = matchNodes(nodes, "storefront depl");
  expect(r[0].node.id).toBe("storefront");
  expect(r[0].why).toBe("");
});

test("limit respected", () => {
  const many = Array.from({ length: 20 }, (_, i) => N("pod" + i, "Pod"));
  expect(matchNodes(many, "pod", 8)).toHaveLength(8);
});
