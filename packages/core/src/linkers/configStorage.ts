import type { K8sObject, ObjectIndex, Edge } from "../types.js";
import { podSpecOf } from "../k8s.js";

function inNs(idx: ObjectIndex, kind: string, ns: string | undefined, name: string): K8sObject | undefined {
  return (idx.byKind.get(kind) ?? []).find((o) => o.name === name && o.namespace === ns);
}

export function configStorageLinker(objects: K8sObject[], idx: ObjectIndex): Edge[] {
  const edges: Edge[] = [];
  const seen = new Set<string>();
  const link = (s: K8sObject, kind: string, name: string, type: Edge["type"], ns = s.namespace) => {
    const t = inNs(idx, kind, ns, name);
    if (!t) return;
    const id = `${type}:${s.uid}->${t.uid}`;
    if (seen.has(id)) return; seen.add(id);
    edges.push({ id, source: s.uid, target: t.uid, type, label: type });
  };
  for (const o of objects) {
    if (o.kind === "PersistentVolumeClaim" && o.spec?.storageClassName) {
      const sc = (idx.byKind.get("StorageClass") ?? []).find((x) => x.name === o.spec.storageClassName);
      if (sc) { const id = `class:${o.uid}->${sc.uid}`; if (!seen.has(id)) { seen.add(id); edges.push({ id, source: o.uid, target: sc.uid, type: "class", label: "class" }); } }
      continue;
    }
    const ps = podSpecOf(o);
    if (!ps) continue;
    if (ps.serviceAccountName) link(o, "ServiceAccount", ps.serviceAccountName, "uses");
    for (const v of ps.volumes ?? []) {
      if (v.configMap?.name) link(o, "ConfigMap", v.configMap.name, "mounts");
      if (v.secret?.secretName) link(o, "Secret", v.secret.secretName, "mounts");
      if (v.persistentVolumeClaim?.claimName) link(o, "PersistentVolumeClaim", v.persistentVolumeClaim.claimName, "mounts");
    }
    for (const c of ps.containers ?? []) {
      for (const ef of c.envFrom ?? []) {
        if (ef.configMapRef?.name) link(o, "ConfigMap", ef.configMapRef.name, "mounts");
        if (ef.secretRef?.name) link(o, "Secret", ef.secretRef.name, "mounts");
      }
      for (const e of c.env ?? []) {
        const cm = e.valueFrom?.configMapKeyRef?.name; if (cm) link(o, "ConfigMap", cm, "mounts");
        const sec = e.valueFrom?.secretKeyRef?.name; if (sec) link(o, "Secret", sec, "mounts");
      }
    }
  }
  return edges;
}
