import type { RawDoc, K8sObject } from "./types.js";
import { splitApiVersion, makeUid, dedupeKey, redactSecret } from "./k8s.js";

export function normalize(docs: RawDoc[]): { objects: K8sObject[]; warnings: string[] } {
  const seen = new Map<string, K8sObject>();
  const warnings: string[] = [];
  for (const d of docs) {
    const o = d.obj;
    if (!o || !o.kind || !o.metadata?.name) continue;
    const [group, version] = splitApiVersion(o.apiVersion ?? "");
    const raw = redactSecret(o);
    const md = o.metadata;
    const obj: K8sObject = {
      uid: makeUid({ group, kind: o.kind, namespace: md.namespace, name: md.name, metaUid: md.uid }),
      apiVersion: o.apiVersion ?? "", group, version, kind: o.kind,
      namespace: md.namespace, name: md.name,
      labels: md.labels ?? {}, annotations: md.annotations ?? {},
      ownerRefs: (md.ownerReferences ?? []).map((r: any) => ({ kind: r.kind, name: r.name, uid: r.uid })),
      spec: raw.spec, raw, source: d.source,
    };
    const key = dedupeKey({ group, kind: o.kind, namespace: md.namespace, name: md.name });
    if (seen.has(key)) warnings.push(`collision: ${key} (last doc wins)`);
    seen.set(key, obj);
  }
  return { objects: [...seen.values()], warnings };
}
