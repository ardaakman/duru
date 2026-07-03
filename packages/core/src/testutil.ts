// Shared test-object factory for K8sObject-based tests.
import type { K8sObject } from "./types.js";

export const mk = (p: Partial<K8sObject>): K8sObject => ({
  uid: p.uid!, apiVersion: p.apiVersion ?? "", group: p.group ?? "", version: p.version ?? "",
  kind: p.kind!, namespace: p.namespace, name: p.name!,
  labels: p.labels ?? {}, annotations: p.annotations ?? {}, ownerRefs: p.ownerRefs ?? [],
  spec: p.spec ?? {}, raw: p.raw ?? { kind: p.kind }, source: p.source,
});
