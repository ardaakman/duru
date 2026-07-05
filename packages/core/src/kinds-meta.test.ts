import { test, expect } from "vitest";
import { kindMeta, groupOf } from "./kinds-meta.js";
import type { K8sObject } from "./types.js";

test("known kinds have tier + Geist accent; unknown falls back to crd", () => {
  expect(kindMeta("Service")).toEqual({ icon: "service", accent: "#0070f3", tier: 1 });
  expect(kindMeta("Deployment").tier).toBe(2);
  expect(kindMeta("PersistentVolumeClaim").tier).toBe(4);
  expect(kindMeta("SomeCRD")).toEqual({ icon: "crd", accent: "#8f8f8f", tier: 2 });
});
test("PV/HPA/NetworkPolicy are built-ins with their own glyph (not the CRD glyph)", () => {
  expect(kindMeta("NetworkPolicy")).toEqual({ icon: "shield", accent: "#0070f3", tier: 1 });
  expect(kindMeta("HorizontalPodAutoscaler").icon).toBe("hpa");
  expect(kindMeta("PersistentVolume").tier).toBe(4);
});
test("well-known CRDs get a tier hint but keep the generic crd glyph", () => {
  expect(kindMeta("HTTPRoute")).toEqual({ icon: "crd", accent: "#8f8f8f", tier: 1 });
  expect(kindMeta("Certificate").tier).toBe(3);
});
test("groupOf uses namespace or cluster-scoped bucket", () => {
  expect(groupOf({ kind: "Pod", namespace: "ns" } as K8sObject)).toBe("ns");
  expect(groupOf({ kind: "StorageClass" } as K8sObject)).toBe("cluster-scoped");
});
