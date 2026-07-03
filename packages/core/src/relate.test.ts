import { test, expect } from "vitest";
import { relate } from "./relate.js";
import { mk } from "./testutil.js";

test("relate runs all linkers and dedupes by id", () => {
  const dep = mk({ uid: "ns/apps/Deployment/d", kind: "Deployment", namespace: "ns", name: "d", spec: { template: { spec: { serviceAccountName: "sa" } } } });
  const sa = mk({ uid: "ns/core/ServiceAccount/sa", kind: "ServiceAccount", namespace: "ns", name: "sa" });
  const edges = relate([dep, sa]);
  expect(edges.some((e) => e.type === "uses" && e.target === "ns/core/ServiceAccount/sa")).toBe(true);
  expect(new Set(edges.map((e) => e.id)).size).toBe(edges.length); // no dup ids
});
