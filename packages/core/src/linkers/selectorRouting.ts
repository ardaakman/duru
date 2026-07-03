import type { K8sObject, ObjectIndex, Edge } from "../types.js";
import { matchesSelector } from "../k8s.js";

const WORKLOADS = new Set(["Deployment", "StatefulSet", "DaemonSet", "ReplicaSet", "Job"]);
function templateLabels(o: K8sObject): Record<string, string> | undefined {
  return o.kind === "Pod" ? o.labels : o.spec?.template?.metadata?.labels;
}
function inNs(idx: ObjectIndex, kind: string, ns: string | undefined, name: string): K8sObject | undefined {
  return (idx.byKind.get(kind) ?? []).find((o) => o.name === name && o.namespace === ns);
}
function push(edges: Edge[], type: Edge["type"], s: K8sObject, t: K8sObject) {
  edges.push({ id: `${type}:${s.uid}->${t.uid}`, source: s.uid, target: t.uid, type, label: type });
}

export function selectorRoutingLinker(objects: K8sObject[], idx: ObjectIndex): Edge[] {
  const edges: Edge[] = [];
  for (const o of objects) {
    if (o.kind === "Service" && o.spec?.selector) {
      for (const t of objects) {
        if (t.namespace !== o.namespace) continue;
        if (t.kind === "Pod" || WORKLOADS.has(t.kind)) {
          if (matchesSelector(templateLabels(t), o.spec.selector)) push(edges, "selects", o, t);
        }
      }
    } else if (o.kind === "Ingress") {
      const names = new Set<string>();
      if (o.spec?.defaultBackend?.service?.name) names.add(o.spec.defaultBackend.service.name);
      for (const r of o.spec?.rules ?? []) for (const p of r.http?.paths ?? []) {
        const n = p.backend?.service?.name ?? p.backend?.serviceName; // v1 + legacy
        if (n) names.add(n);
      }
      for (const n of names) { const svc = inNs(idx, "Service", o.namespace, n); if (svc) push(edges, "routes", o, svc); }
    } else if (o.kind === "NetworkPolicy") {
      // NB: NetworkPolicy semantics differ from Service — podSelector: {} (or empty
      // matchLabels) means ALL pods in the namespace, not "nothing".
      const ps = o.spec?.podSelector;
      const ml = ps?.matchLabels;
      const all = !ps || Object.keys(ps).length === 0 || (ml && Object.keys(ml).length === 0 && !ps.matchExpressions);
      for (const t of objects) {
        if (t.namespace !== o.namespace) continue;
        if (!(t.kind === "Pod" || WORKLOADS.has(t.kind))) continue;
        if (all || (ml && Object.keys(ml).length > 0 && matchesSelector(templateLabels(t), ml))) push(edges, "selects", o, t);
      }
    } else if (o.kind === "HorizontalPodAutoscaler") {
      const ref = o.spec?.scaleTargetRef;
      if (ref?.name) { const w = inNs(idx, ref.kind, o.namespace, ref.name); if (w) push(edges, "routes", o, w); }
    }
  }
  return edges;
}
