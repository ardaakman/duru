import type { Node } from "./types.js";

// Core-owned kind aliases (badge abbrevs; source of truth for search).
export const KIND_ALIASES: Record<string, string> = {
  depl: "Deployment", rs: "ReplicaSet", sts: "StatefulSet", ds: "DaemonSet",
  cron: "CronJob", rc: "ReplicationController", pod: "Pod", svc: "Service",
  ing: "Ingress", gw: "Gateway", rt: "HTTPRoute", np: "NetworkPolicy",
  cm: "ConfigMap", hpa: "HorizontalPodAutoscaler", sec: "Secret",
  pvc: "PersistentVolumeClaim", pv: "PersistentVolume", sc: "StorageClass", sa: "ServiceAccount",
};

interface Hit { why: string }

// One node vs one lowercase token. Returns null on miss, or the why-annotation
// ("" when the NAME matched — no annotation needed for the obvious case).
function tokenHit(n: Node, t: string): Hit | null {
  if (n.name.toLowerCase().includes(t)) return { why: "" };
  const kindL = n.kind.toLowerCase();
  if (kindL.includes(t) || KIND_ALIASES[t] === n.kind) return { why: "kind" };
  if (n.ns && n.ns.toLowerCase().includes(t)) return { why: `ns ${n.ns}` };
  for (const [k, v] of Object.entries(n.labels ?? {})) {
    const kv = `${k}=${v}`.toLowerCase();
    if (k.toLowerCase().includes(t) || v.toLowerCase().includes(t) || kv === t || kv.includes(t))
      return { why: `label ${k}=${v}` };
  }
  return null;
}

// Contract: a node matches iff EVERY token hits ≥1 field. why = "" if any token
// matched the name (the obvious case needs no annotation); else the first
// non-empty why in token order.
export function matchNodes(nodes: Node[], query: string, limit = 8): { node: Node; why: string }[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const out: { node: Node; why: string }[] = [];
  for (const n of nodes) {
    const hits = tokens.map((t) => tokenHit(n, t));
    if (hits.some((h) => h === null)) continue;
    const why = hits.some((h) => h!.why === "") ? "" : hits.find((h) => h!.why)!.why;
    out.push({ node: n, why });
    if (out.length >= limit) break;
  }
  return out;
}
