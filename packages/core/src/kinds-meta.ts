import type { K8sObject } from "./types.js";

type Meta = { icon: string; accent: string; tier: number };
// Geist palette (docs/geist-tokens.md). tier: routing 1, workload 2, config 3, storage 4, node 5.
const INK = "#171717", BLUE = "#0070f3", TEAL = "#00a389", AMBER = "#f5a623", VIOLET = "#7928ca", MAGENTA = "#eb367f", MUTE = "#8f8f8f";
export const KIND_META: Record<string, Meta> = {
  Ingress: { icon: "ingress", accent: BLUE, tier: 1 },
  Gateway: { icon: "ingress", accent: BLUE, tier: 1 },
  Service: { icon: "service", accent: BLUE, tier: 1 },
  Deployment: { icon: "deployment", accent: INK, tier: 2 },
  StatefulSet: { icon: "statefulset", accent: INK, tier: 2 },
  DaemonSet: { icon: "daemonset", accent: INK, tier: 2 },
  ReplicaSet: { icon: "deployment", accent: TEAL, tier: 2 },
  Job: { icon: "job", accent: INK, tier: 2 },
  CronJob: { icon: "job", accent: INK, tier: 2 },
  Pod: { icon: "pod", accent: TEAL, tier: 2 },
  NetworkPolicy: { icon: "shield", accent: BLUE, tier: 1 }, // built-in, NOT a CRD
  HorizontalPodAutoscaler: { icon: "hpa", accent: INK, tier: 2 },
  ConfigMap: { icon: "configmap", accent: AMBER, tier: 3 },
  Secret: { icon: "secret", accent: MAGENTA, tier: 3 },
  ServiceAccount: { icon: "key", accent: MUTE, tier: 3 },
  PersistentVolumeClaim: { icon: "pvc", accent: VIOLET, tier: 4 },
  PersistentVolume: { icon: "pvc", accent: VIOLET, tier: 4 },
  StorageClass: { icon: "storageclass", accent: VIOLET, tier: 4 },
  Node: { icon: "node", accent: MUTE, tier: 5 },
};
// §13.7: keep Layered from looking flat on CRD-heavy repos — a few well-known CRDs
// get a meaningful tier while still using the generic CRD glyph + Kind·apiVersion summary.
export const CRD_TIER_HINTS: Record<string, number> = { HTTPRoute: 1, CiliumNetworkPolicy: 1, Certificate: 3, Application: 2 };
export function kindMeta(kind: string): Meta {
  return KIND_META[kind] ?? { icon: "crd", accent: MUTE, tier: CRD_TIER_HINTS[kind] ?? 2 };
}

export const CLUSTER_SCOPED = new Set([
  "Namespace", "Node", "StorageClass", "PersistentVolume", "ClusterRole", "ClusterRoleBinding",
  "CustomResourceDefinition", "PriorityClass", "ValidatingWebhookConfiguration", "MutatingWebhookConfiguration",
]);
export function groupOf(o: K8sObject): string { return o.namespace ?? "cluster-scoped"; }
