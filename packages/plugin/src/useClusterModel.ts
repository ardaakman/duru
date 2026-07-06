import type { GraphModel, Health } from "@duru/core";
import { diffModels } from "@duru/core";
import { K8s } from "@kinvolk/headlamp-plugin/lib";
import { useCallback, useEffect, useRef, useState } from "react";
import { buildLiveModel } from "./adapter";
import { fetchAllCRs } from "./crds";

const KINDS: [string, any][] = [
  ["Pod", K8s.ResourceClasses.Pod], ["Deployment", K8s.ResourceClasses.Deployment],
  ["ReplicaSet", K8s.ResourceClasses.ReplicaSet], ["StatefulSet", K8s.ResourceClasses.StatefulSet],
  ["DaemonSet", K8s.ResourceClasses.DaemonSet], ["Job", K8s.ResourceClasses.Job],
  ["CronJob", K8s.ResourceClasses.CronJob], ["Service", K8s.ResourceClasses.Service],
  ["Ingress", K8s.ResourceClasses.Ingress], ["ConfigMap", K8s.ResourceClasses.ConfigMap],
  ["Secret", K8s.ResourceClasses.Secret], ["PersistentVolumeClaim", K8s.ResourceClasses.PersistentVolumeClaim],
  ["PersistentVolume", K8s.ResourceClasses.PersistentVolume], ["StorageClass", K8s.ResourceClasses.StorageClass],
  ["ServiceAccount", K8s.ResourceClasses.ServiceAccount],
  ["HorizontalPodAutoscaler", (K8s.ResourceClasses as any).HPA ?? (K8s.ResourceClasses as any).HorizontalPodAutoscaler],
  ["NetworkPolicy", K8s.ResourceClasses.NetworkPolicy], ["Node", K8s.ResourceClasses.Node],
];

function applyHealthPatches(m: GraphModel, patches: Map<string, Health>): GraphModel {
  if (!patches.size) return m;
  return { ...m, nodes: m.nodes.map((n) => (patches.has(n.id) ? { ...n, health: patches.get(n.id) } : n)) };
}

export function useClusterModel(opts: { crs?: boolean } = {}) {
  // Hooks called in a FIXED order (KINDS is module-constant) — rules-of-hooks safe.
  const results = KINDS.map(([, rc]) => rc.useList());
  // 19th fixed hook: CRD catalog (definitions only, always mounted). Capture the error too —
  // a user without CRD RBAC otherwise gets a toggle that silently does nothing.
  const [crdDefs, crdErr] = K8s.ResourceClasses.CustomResourceDefinition.useList();
  const [displayed, setDisplayed] = useState<GraphModel | null>(null);
  const [pending, setPending] = useState(0);
  const [structureRev, setStructureRev] = useState(0);
  const candidateRef = useRef<GraphModel | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // CR instances: fetched imperatively (not a hook) on toggle-on and every 30s while on.
  const [crData, setCrData] = useState<{ objects: any[]; warnings: string[] }>({ objects: [], warnings: [] });
  const [crFetchCount, setCrFetchCount] = useState(0);   // bumps on EVERY completed fetch → debounce dep
  const [crLoading, setCrLoading] = useState(false);
  const crBusy = useRef(false);
  const crFirst = useRef(true);
  useEffect(() => {
    if (!opts.crs) { setCrData({ objects: [], warnings: [] }); setCrFetchCount((c) => c + 1); setCrLoading(false); crFirst.current = true; return; }
    let stop = false;
    const run = async () => {
      if (crBusy.current) return;                        // overlap guard
      crBusy.current = true;
      if (crFirst.current) setCrLoading(true);           // spinner on the FIRST fetch only (spec §4)
      try {
        const res = await fetchAllCRs(crdDefs ? crdDefs.map((c: any) => c?.jsonData) : []);
        if (stop) return;
        crFirst.current = false;
        setCrData(res);
        setCrFetchCount((c) => c + 1);
      } finally {
        crBusy.current = false;                          // never sticks on a throw
        if (!stop) setCrLoading(false);
      }
    };
    run();
    const t = setInterval(run, 30_000);
    return () => { stop = true; clearInterval(t); };
    // crdDefs?.length (not crdDefs): content-only CRD changes wait for the next 30s tick
    // BY DESIGN — depping the array identity would refetch-storm on every watch tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.crs, crdDefs?.length]);

  const warnings: string[] = [];
  const lists: (any[] | null)[] = results.map(([items, error], i) => {
    if (error) { warnings.push(`${KINDS[i][0]} unavailable: ${String(error)}`); return null; }
    return items ? items.map((o: any) => o.jsonData) : null;
  });
  const loading = displayed === null && results.some(([items, error]) => items === null && !error);

  // Debounce trigger: depend on each kind's `items` array IDENTITY, not a length-derived
  // string. Verified against the installed lib (useKubeObjectList.js): useList()'s `items`
  // is rebuilt via `.flatMap` inside TanStack Query's `combine`, which only re-runs when a
  // query's underlying data actually changes — and watch-driven updates only replace the
  // cached list (`KubeList.applyUpdate`) when it is structurally different. So `items`
  // gets a new reference on every real change, including same-length status-only edits
  // (e.g. a pod flipping Ready) that a length-only key would miss. warnings.length and
  // loading are kept as auxiliary triggers for hook-error/loading-state transitions.
  const itemsRefs = results.map(([items]) => items);

  // CR warnings flow through the hook's existing warnings array — no separate channel —
  // so the top bar's single ⚠ chip picks them up automatically.
  const crCatalogWarn = opts.crs && crdErr ? [`CustomResourceDefinitions unavailable: ${String(crdErr)}`] : [];
  const allWarnings = [...warnings, ...crData.warnings, ...crCatalogWarn];
  const mergedLists = crData.objects.length ? [...lists, crData.objects] : lists;

  useEffect(() => {
    if (loading) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const candidate = buildLiveModel(mergedLists, allWarnings);
      candidateRef.current = candidate;
      setDisplayed((cur) => {
        if (cur === null) { setStructureRev((r) => r + 1); setPending(0); return candidate; }  // first adopt
        const d = diffModels(cur, candidate);
        setPending(d.topologyChanged ? d.changeCount : 0);
        return applyHealthPatches(cur, d.healthPatches);   // live dots, structureRev untouched
      });
    }, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...itemsRefs, warnings.length, loading, crFetchCount]);

  const refresh = useCallback(() => {
    if (candidateRef.current) {
      setDisplayed(candidateRef.current);
      setStructureRev((r) => r + 1);
      setPending(0);
    }
  }, []);

  return { model: displayed, pending, refresh, structureRev, loading, warnings: allWarnings, crLoading };
}
