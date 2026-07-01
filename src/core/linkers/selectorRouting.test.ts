import { test, expect } from "vitest";
import { selectorRoutingLinker } from "./selectorRouting.js";
import { buildIndex } from "../k8s.js";
import { mk } from "../testutil.js";
import type { K8sObject } from "../types.js";

test("Service selects a workload via pod-template labels", () => {
  const svc = mk({ uid: "ns/core/Service/s", kind: "Service", namespace: "ns", name: "s", spec: { selector: { app: "m" } } });
  const dep = mk({ uid: "ns/apps/Deployment/m", kind: "Deployment", namespace: "ns", name: "m", spec: { template: { metadata: { labels: { app: "m" } } } } });
  const edges = selectorRoutingLinker([svc, dep], buildIndex([svc, dep]));
  expect(edges).toContainEqual({ id: "selects:ns/core/Service/s->ns/apps/Deployment/m", source: "ns/core/Service/s", target: "ns/apps/Deployment/m", type: "selects", label: "selects" });
});
test("Ingress routes to a Service by name", () => {
  const ing = mk({ uid: "ns/networking.k8s.io/Ingress/i", kind: "Ingress", namespace: "ns", name: "i", spec: { rules: [{ http: { paths: [{ backend: { service: { name: "s" } } }] } }] } });
  const svc = mk({ uid: "ns/core/Service/s", kind: "Service", namespace: "ns", name: "s", spec: {} });
  const edges = selectorRoutingLinker([ing, svc], buildIndex([ing, svc]));
  expect(edges).toContainEqual({ id: "routes:ns/networking.k8s.io/Ingress/i->ns/core/Service/s", source: "ns/networking.k8s.io/Ingress/i", target: "ns/core/Service/s", type: "routes", label: "routes" });
});
test("NetworkPolicy podSelector {} targets ALL workloads in the namespace (not nothing)", () => {
  const np = mk({ uid: "ns/networking.k8s.io/NetworkPolicy/np", kind: "NetworkPolicy", namespace: "ns", name: "np", spec: { podSelector: {} } });
  const a = mk({ uid: "ns/apps/Deployment/a", kind: "Deployment", namespace: "ns", name: "a", spec: { template: { metadata: { labels: { app: "a" } } } } });
  const b = mk({ uid: "ns/apps/Deployment/b", kind: "Deployment", namespace: "ns", name: "b", spec: { template: { metadata: { labels: { app: "b" } } } } });
  const other = mk({ uid: "x/apps/Deployment/c", kind: "Deployment", namespace: "x", name: "c" }); // different ns → excluded
  const edges = selectorRoutingLinker([np, a, b, other], buildIndex([np, a, b, other]));
  const targets = edges.filter((e) => e.type === "selects").map((e) => e.target).sort();
  expect(targets).toEqual(["ns/apps/Deployment/a", "ns/apps/Deployment/b"]);
});
