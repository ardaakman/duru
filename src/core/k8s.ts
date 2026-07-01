import type { K8sObject, ObjectIndex } from "./types.js";

export function splitApiVersion(av: string): [string, string] {
  if (!av) return ["", ""];
  const i = av.indexOf("/");
  return i === -1 ? ["", av] : [av.slice(0, i), av.slice(i + 1)];
}

export function makeUid(o: { group?: string; kind: string; namespace?: string; name: string; metaUid?: string }): string {
  if (o.metaUid) return o.metaUid;
  const g = o.group ? o.group : "core";
  const ns = o.namespace ?? "_";
  return `${ns}/${g}/${o.kind}/${o.name}`;
}

export function dedupeKey(o: { group?: string; kind: string; namespace?: string; name: string }): string {
  const g = o.group ? o.group : "core";
  return `${g}/${o.kind}/${o.namespace ?? "_"}/${o.name}`;
}

const SECRET_FIELDS = ["data", "stringData"];
const LAST_APPLIED = "kubectl.kubernetes.io/last-applied-configuration";
export function redactSecret(obj: any): any {
  if (!obj || obj.kind !== "Secret") return obj;
  const c = structuredClone(obj);
  for (const f of SECRET_FIELDS) {
    if (c[f] && typeof c[f] === "object") for (const k of Object.keys(c[f])) c[f][k] = "<redacted>";
  }
  // last-applied-configuration embeds the full manifest incl. base64 data — redact it too.
  if (c.metadata?.annotations?.[LAST_APPLIED] !== undefined) c.metadata.annotations[LAST_APPLIED] = "<redacted>";
  return c;
}

export function buildIndex(objects: K8sObject[]): ObjectIndex {
  const byUid = new Map<string, K8sObject>();
  const byKind = new Map<string, K8sObject[]>();
  for (const o of objects) {
    byUid.set(o.uid, o);
    const arr = byKind.get(o.kind) ?? [];
    arr.push(o); byKind.set(o.kind, arr);
  }
  return { list: objects, byUid, byKind };
}

export function matchesSelector(labels: Record<string, string> | undefined, selector: Record<string, string> | undefined): boolean {
  if (!selector || Object.keys(selector).length === 0) return false; // empty selector matches nothing (avoid phantom edges)
  if (!labels) return false;
  return Object.entries(selector).every(([k, v]) => labels[k] === v);
}

export function podSpecOf(o: K8sObject): any {
  return o.kind === "Pod" ? o.spec : o.spec?.template?.spec;
}
