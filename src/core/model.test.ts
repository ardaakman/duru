import { test, expect } from "vitest";
import { buildModel } from "./model.js";
import { relate } from "./relate.js";
import { mk } from "./testutil.js";

test("dump: Deployment->RS->2 Pods are ALL nodes, wired by parentId (no folding)", () => {
  const dep = mk({ uid: "ns/apps/Deployment/d", kind: "Deployment", namespace: "ns", name: "d" });
  const rs = mk({ uid: "ns/apps/ReplicaSet/rs", kind: "ReplicaSet", namespace: "ns", name: "rs", ownerRefs: [{ kind: "Deployment", name: "d", uid: "ns/apps/Deployment/d" }] });
  const p1 = mk({ uid: "ns/core/Pod/p1", kind: "Pod", namespace: "ns", name: "p1", ownerRefs: [{ kind: "ReplicaSet", name: "rs", uid: "ns/apps/ReplicaSet/rs" }], spec: { nodeName: "node-1" } });
  const p2 = mk({ uid: "ns/core/Pod/p2", kind: "Pod", namespace: "ns", name: "p2", ownerRefs: [{ kind: "ReplicaSet", name: "rs", uid: "ns/apps/ReplicaSet/rs" }] });
  const objs = [dep, rs, p1, p2];
  const m = buildModel(objs, relate(objs));
  expect(new Set(m.nodes.map((n) => n.id))).toEqual(new Set(objs.map((o) => o.uid)));
  const byId = new Map(m.nodes.map((n) => [n.id, n]));
  expect(byId.get("ns/apps/ReplicaSet/rs")!.parentId).toBe("ns/apps/Deployment/d");
  expect(byId.get("ns/core/Pod/p1")!.parentId).toBe("ns/apps/ReplicaSet/rs");
  expect(byId.get("ns/apps/Deployment/d")!.parentId).toBeUndefined();
  expect(m.groups).toContainEqual({ id: "ns", label: "ns" });
});

test("manifest: Deployment with replicas and no pods is a leaf (no parentId, count from replicas, health unknown)", () => {
  const dep = mk({ uid: "ns/apps/Deployment/d", kind: "Deployment", namespace: "ns", name: "d", spec: { replicas: 3 }, raw: { kind: "Deployment", spec: { replicas: 3 } } });
  const m = buildModel([dep], []);
  expect(m.nodes).toHaveLength(1);
  expect(m.nodes[0].count).toBe(3);
  expect(m.nodes[0].parentId).toBeUndefined();
  expect(m.nodes[0].health).toBe("unknown");
  expect(m.nodes[0].manifest).toContain("replicas: 3");
});

test("Namespace objects are dropped (represented by synthetic group roots in the renderer)", () => {
  const ns = mk({ uid: "_/core/Namespace/ns", kind: "Namespace", name: "ns" });
  const dep = mk({ uid: "ns/apps/Deployment/d", kind: "Deployment", namespace: "ns", name: "d" });
  const m = buildModel([ns, dep], []);
  expect(m.nodes.map((n) => n.kind)).toEqual(["Deployment"]);
});

test("unknown/CRD kind gets crd icon + 'Kind · apiVersion' summary (never empty)", () => {
  const cr = mk({ uid: "ns/cilium.io/CiliumNetworkPolicy/p", kind: "CiliumNetworkPolicy", namespace: "ns", name: "p" });
  cr.apiVersion = "cilium.io/v2";
  const m = buildModel([cr], []);
  expect(m.nodes[0].icon).toBe("crd");
  expect(m.nodes[0].summary).toBe("CiliumNetworkPolicy · cilium.io/v2");
});
