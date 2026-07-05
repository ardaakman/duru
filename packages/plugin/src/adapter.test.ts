import type { GraphModel } from "@duru/core";
import { expect,test } from "vitest";
import { buildLiveModel,toRawDocs } from "./adapter";

const dep = { apiVersion: "apps/v1", kind: "Deployment", metadata: { name: "web", namespace: "shop", uid: "dep-web", labels: { app: "web" } }, spec: { replicas: 2 }, status: { replicas: 2, availableReplicas: 2 } };
const rs = { apiVersion: "apps/v1", kind: "ReplicaSet", metadata: { name: "web-1", namespace: "shop", uid: "rs-web", ownerReferences: [{ kind: "Deployment", name: "web", uid: "dep-web" }] }, spec: { replicas: 2 } };
const pod = { apiVersion: "v1", kind: "Pod", metadata: { name: "web-1-a", namespace: "shop", uid: "pod-a", labels: { app: "web" }, ownerReferences: [{ kind: "ReplicaSet", name: "web-1", uid: "rs-web" }] }, status: { phase: "Running", containerStatuses: [{ ready: true }] } };
const svc = { apiVersion: "v1", kind: "Service", metadata: { name: "web", namespace: "shop", uid: "svc-web" }, spec: { selector: { app: "web" } } };
const secret = { apiVersion: "v1", kind: "Secret", metadata: { name: "tok", namespace: "shop", uid: "sec-tok" }, data: { k: "c2VjcmV0" } };

test("toRawDocs flattens per-kind lists, skipping nulls", () => {
  expect(toRawDocs([[dep], null, [pod, svc]]).length).toBe(3);
});

test("buildLiveModel: live objects → ownership tree with health, NO manifests, secrets never carried", () => {
  const m: GraphModel = buildLiveModel([[dep], [rs], [pod], [svc], [secret]], []);
  const rsNode = m.nodes.find((n) => n.kind === "ReplicaSet")!;
  const podNode = m.nodes.find((n) => n.kind === "Pod")!;
  expect(rsNode.parentId).toBe(m.nodes.find((n) => n.kind === "Deployment")!.id);
  expect(podNode.parentId).toBe(rsNode.id);
  expect(podNode.health).toBe("ok");
  expect(m.nodes.every((n) => n.manifest === undefined)).toBe(true);            // manifests:false
  expect(JSON.stringify(m)).not.toContain("c2VjcmV0");                          // secret data absent from the model
  expect(m.edges.some((e) => e.type === "selects")).toBe(true);                 // selector linker ran
});

test("buildLiveModel surfaces provided warnings", () => {
  const m = buildLiveModel([[dep]], ["Pod unavailable: forbidden"]);
  expect(m.warnings).toContain("Pod unavailable: forbidden");
});
