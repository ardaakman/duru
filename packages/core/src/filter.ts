import type { Forest, Rollup } from "./tree.js";

export interface Filters { namespaces: Set<string>; kinds: Set<string>; problemsOnly: boolean }
export const emptyFilters = (): Filters => ({ namespaces: new Set(), kinds: new Set(), problemsOnly: false });
export const filtersActive = (f: Filters) => f.namespaces.size > 0 || f.kinds.size > 0 || f.problemsOnly;

// ids whose subtree (self included) contains a node of a selected kind.
export function subtreeHasKind(forest: Forest, kinds: Set<string>): Set<string> {
  const out = new Set<string>();
  const walk = (id: string): boolean => {
    let has = kinds.has(forest.byId.get(id)!.kind);
    for (const c of forest.childrenOf.get(id) ?? []) if (walk(c)) has = true;
    if (has) out.add(id);
    return has;
  };
  for (const root of forest.roots) walk(root);
  return out;
}

// Spec §4: scoping with ancestry retention; active dimensions AND together.
export function applyFilters(forest: Forest, rollup: Map<string, Rollup>, ids: string[], f: Filters): string[] {
  if (!filtersActive(f)) return ids;
  const kindKeep = f.kinds.size ? subtreeHasKind(forest, f.kinds) : null;
  return ids.filter((id) => {
    const n = forest.byId.get(id);
    if (!n) return false;
    if (f.namespaces.size && !f.namespaces.has(n.group)) return false;
    if (kindKeep && !kindKeep.has(id)) return false;
    if (f.problemsOnly) {
      const w = rollup.get(id)?.worst;
      if (w !== "warn" && w !== "error") return false;
    }
    return true;
  });
}
