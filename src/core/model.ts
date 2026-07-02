import type { K8sObject, Edge, GraphModel, Node } from "./types.js";
import { kindMeta, groupOf, KIND_META } from "./kinds.js";
import { deriveHealth } from "./health.js";
import { stringify as yamlStringify } from "yaml";

function declaredReplicas(o: K8sObject): number | undefined {
  const r = o.spec?.replicas;
  return typeof r === "number" ? r : undefined;
}
// Inspector "what it is": built-in kinds → kind; unknown/CRD → "Kind · apiVersion".
function summarize(o: K8sObject): string {
  return o.kind in KIND_META ? o.kind : `${o.kind} · ${o.apiVersion || "?"}`;
}

export function buildModel(objects: K8sObject[], edges: Edge[], warnings: string[] = []): GraphModel {
  // parentId = the source of this object's owns edge (ownership tree parent).
  const parentOf = new Map<string, string>();
  for (const e of edges) if (e.type === "owns") parentOf.set(e.target, e.source);

  // Namespaces become synthetic group roots in the renderer — drop the real objects.
  const nodes: Node[] = objects
    .filter((o) => o.kind !== "Namespace")
    .map((o) => {
      const m = kindMeta(o.kind);
      const replicas = declaredReplicas(o);
      return {
        id: o.uid, kind: o.kind, name: o.name, ns: o.namespace ?? "", group: groupOf(o),
        icon: m.icon, accent: m.accent, tier: m.tier,
        count: replicas && replicas > 1 ? replicas : undefined,
        labels: Object.keys(o.labels).length ? o.labels : undefined,
        summary: summarize(o), nodeName: o.spec?.nodeName,
        parentId: parentOf.get(o.uid), health: deriveHealth(o),
        manifest: yamlStringify(o.raw), source: o.source,
      };
    });

  // Keep all edges (dedupe, drop self loops). No folding/resolution.
  const seen = new Set<string>();
  const outEdges: Edge[] = [];
  for (const e of edges) {
    if (e.source === e.target) continue;
    const id = `${e.type}:${e.source}->${e.target}`;
    if (seen.has(id)) continue; seen.add(id);
    outEdges.push({ ...e, id });
  }
  const groupIds = [...new Set(nodes.map((n) => n.group))];
  return { nodes, edges: outEdges, groups: groupIds.map((id) => ({ id, label: id })), warnings };
}
