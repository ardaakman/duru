import { test, expect } from "vitest";
import { buildModel } from "./model.js";
import { relate } from "./relate.js";
import { mk } from "./testutil.js";

test("dump: Deployment->RS->2 Pods folds to one node with count 2, RS/Pods hidden", () => {
  const dep = mk({ uid: "ns/apps/Deployment/d", kind: "Deployment", namespace: "ns", name: "d" });
  const rs = mk({ uid: "ns/apps/ReplicaSet/rs", kind: "ReplicaSet", namespace: "ns", name: "rs", ownerRefs: [{ kind: "Deployment", name: "d", uid: "ns/apps/Deployment/d" }] });
  const p1 = mk({ uid: "ns/core/Pod/p1", kind: "Pod", namespace: "ns", name: "p1", ownerRefs: [{ kind: "ReplicaSet", name: "rs", uid: "ns/apps/ReplicaSet/rs" }], spec: { nodeName: "node-1" } });
  const p2 = mk({ uid: "ns/core/Pod/p2", kind: "Pod", namespace: "ns", name: "p2", ownerRefs: [{ kind: "ReplicaSet", name: "rs", uid: "ns/apps/ReplicaSet/rs" }] });
  const objs = [dep, rs, p1, p2];
  const m = buildModel(objs, relate(objs));
  expect(m.nodes.map((n) => n.id)).toEqual(["ns/apps/Deployment/d"]);
  expect(m.nodes[0].count).toBe(2);
  expect(m.groups).toContainEqual({ id: "ns", label: "ns" });
});
test("manifest: Deployment with spec.replicas and no pods shows count from replicas", () => {
  const dep = mk({ uid: "ns/apps/Deployment/d", kind: "Deployment", namespace: "ns", name: "d", spec: { replicas: 3 }, raw: { kind: "Deployment", spec: { replicas: 3 } } });
  const m = buildModel([dep], []);
  expect(m.nodes[0].count).toBe(3);
  expect(typeof m.nodes[0].manifest).toBe("string");
  expect(m.nodes[0].manifest).toContain("replicas: 3");
});
test("unknown/CRD kind gets crd icon + a 'Kind · apiVersion' summary (never empty)", () => {
  const cr = mk({ uid: "ns/cilium.io/CiliumNetworkPolicy/p", apiVersion: "cilium.io/v2", kind: "CiliumNetworkPolicy", namespace: "ns", name: "p" });
  cr.apiVersion = "cilium.io/v2";
  const m = buildModel([cr], []);
  expect(m.nodes[0].icon).toBe("crd");
  expect(m.nodes[0].summary).toBe("CiliumNetworkPolicy · cilium.io/v2");
});
test("bare ReplicaSet with Pods folds Pods into the RS (no double-count)", () => {
  const rs = mk({ uid: "ns/apps/ReplicaSet/rs", kind: "ReplicaSet", namespace: "ns", name: "rs", spec: { replicas: 2 } });
  const p1 = mk({ uid: "ns/core/Pod/p1", kind: "Pod", namespace: "ns", name: "p1", ownerRefs: [{ kind: "ReplicaSet", name: "rs", uid: "ns/apps/ReplicaSet/rs" }] });
  const p2 = mk({ uid: "ns/core/Pod/p2", kind: "Pod", namespace: "ns", name: "p2", ownerRefs: [{ kind: "ReplicaSet", name: "rs", uid: "ns/apps/ReplicaSet/rs" }] });
  const m = buildModel([rs, p1, p2], []);
  expect(m.nodes.map((n) => n.id)).toEqual(["ns/apps/ReplicaSet/rs"]);
  expect(m.nodes[0].count).toBe(2);
});
