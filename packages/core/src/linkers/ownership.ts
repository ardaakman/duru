import type { K8sObject, ObjectIndex, Edge } from "../types.js";

function resolveOwner(child: K8sObject, ref: { kind: string; name: string; uid?: string }, idx: ObjectIndex): K8sObject | undefined {
  if (ref.uid && idx.byUid.has(ref.uid)) return idx.byUid.get(ref.uid);
  return (idx.byKind.get(ref.kind) ?? []).find((o) => o.name === ref.name && o.namespace === child.namespace);
}

export function ownershipLinker(objects: K8sObject[], idx: ObjectIndex): Edge[] {
  const edges: Edge[] = [];
  for (const o of objects) {
    for (const ref of o.ownerRefs) {
      const owner = resolveOwner(o, ref, idx);
      if (owner) edges.push({ id: `owns:${owner.uid}->${o.uid}`, source: owner.uid, target: o.uid, type: "owns", label: "owns" });
    }
  }
  return edges;
}
