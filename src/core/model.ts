import type { K8sObject, Edge, GraphModel, Node } from "./types.js";
import { buildIndex } from "./k8s.js";
import { kindMeta, groupOf, KIND_META } from "./kinds.js";
import { stringify as yamlStringify } from "yaml";

const FOLDABLE = new Set(["ReplicaSet", "Pod"]);

function ownerObj(o: K8sObject, idx: ReturnType<typeof buildIndex>): K8sObject | undefined {
  const r = o.ownerRefs[0];
  if (!r) return undefined;
  if (r.uid && idx.byUid.has(r.uid)) return idx.byUid.get(r.uid);
  return (idx.byKind.get(r.kind) ?? []).find((x) => x.name === r.name && x.namespace === o.namespace);
}
function foldTarget(o: K8sObject, idx: ReturnType<typeof buildIndex>): K8sObject | undefined {
  let cur: K8sObject | undefined = o;
  const guard = new Set<string>();
  while (cur && FOLDABLE.has(cur.kind)) {
    if (guard.has(cur.uid)) return undefined; guard.add(cur.uid);
    cur = ownerObj(cur, idx);
  }
  return cur && !FOLDABLE.has(cur.kind) ? cur : undefined;
}
function declaredReplicas(o: K8sObject): number | undefined {
  const r = o.spec?.replicas;
  return typeof r === "number" ? r : undefined;
}
function summarize(o: K8sObject, count?: number): string {
  // §13.14: built-in kinds → kind; unknown/CRD → "Kind · apiVersion" so the
  // inspector is never empty for the CRDs that make real repos interesting.
  const base = o.kind in KIND_META ? o.kind : `${o.kind} · ${o.apiVersion || "?"}`;
  return count && count > 1 ? `${base} · ×${count}` : base;
}

export function buildModel(objects: K8sObject[], edges: Edge[], warnings: string[] = []): GraphModel {
  const idx = buildIndex(objects);
  const foldMap = new Map<string, string>(); // childUid -> workloadUid
  const podCount = new Map<string, number>();
  for (const o of objects) {
    if (!FOLDABLE.has(o.kind)) continue;
    const t = foldTarget(o, idx);
    if (t) { foldMap.set(o.uid, t.uid); if (o.kind === "Pod") podCount.set(t.uid, (podCount.get(t.uid) ?? 0) + 1); }
  }
  const visible = objects.filter((o) => !foldMap.has(o.uid));
  const nodes: Node[] = visible.map((o) => {
    const m = kindMeta(o.kind);
    const count = podCount.get(o.uid) ?? declaredReplicas(o);
    return {
      id: o.uid, kind: o.kind, name: o.name, ns: o.namespace ?? "", group: groupOf(o),
      icon: m.icon, accent: m.accent, tier: m.tier,
      count: count && count > 1 ? count : undefined,
      summary: summarize(o, count), nodeName: o.spec?.nodeName,
      manifest: yamlStringify(o.raw), source: o.source,
    };
  });
  const resolve = (uid: string) => foldMap.get(uid) ?? uid;
  const seen = new Set<string>();
  const outEdges: Edge[] = [];
  for (const e of edges) {
    const s = resolve(e.source), t = resolve(e.target);
    if (s === t) continue;
    const id = `${e.type}:${s}->${t}`;
    if (seen.has(id)) continue; seen.add(id);
    outEdges.push({ ...e, id, source: s, target: t });
  }
  const groupIds = [...new Set(nodes.map((n) => n.group))];
  return { nodes, edges: outEdges, groups: groupIds.map((id) => ({ id, label: id })), warnings };
}
