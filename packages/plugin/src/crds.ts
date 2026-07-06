import { ApiProxy } from "@kinvolk/headlamp-plugin/lib";

export function pickVersion(crd: any): string | null {
  const vs: any[] = crd?.spec?.versions ?? [];
  return vs.find((v) => v.served && v.storage)?.name ?? vs.find((v) => v.served)?.name ?? null;
}

export function injectTypeMeta(items: any[], crd: any, version: string): any[] {
  const kind = crd?.spec?.names?.kind;
  const apiVersion = `${crd?.spec?.group}/${version}`;
  // Injection wins on partially-typed items (spread first) — a present kind with a
  // missing apiVersion gets BOTH set consistently from the CRD.
  return items.map((it) => (it.kind && it.apiVersion ? it : { ...it, kind, apiVersion }));
}

// Fetch every CRD's instances via the host ApiProxy (cluster-wide list endpoints).
// Caps per spec §3; each failure degrades to ONE warning and skips that CRD.
export async function fetchAllCRs(crds: any[], caps: { perCrd?: number; total?: number } = {}): Promise<{ objects: any[]; warnings: string[] }> {
  const perCrd = caps.perCrd ?? 500;
  const total = caps.total ?? 2000;
  const objects: any[] = [];
  const warnings: string[] = [];
  let capped = false;
  for (const crd of crds) {
    if (objects.length >= total) { capped = true; break; }
    const version = pickVersion(crd);
    const group = crd?.spec?.group;
    const plural = crd?.spec?.names?.plural;
    if (!version || !group || !plural) continue;
    try {
      const res: any = await ApiProxy.request(`/apis/${group}/${version}/${plural}`);
      const items: any[] = res?.items ?? [];
      if (items.length > perCrd) capped = true;
      const take = items.slice(0, Math.min(perCrd, total - objects.length));
      if (take.length < items.length) capped = true;
      objects.push(...injectTypeMeta(take, crd, version));
    } catch (e: any) {
      warnings.push(`${crd?.spec?.names?.kind ?? plural} unavailable: ${e?.message ?? String(e)}`);
    }
  }
  if (capped) warnings.push("custom resources capped (500/CRD, 2000 total)");
  return { objects, warnings };
}
