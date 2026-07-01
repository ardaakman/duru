import type { K8sObject, Edge, Linker } from "./types.js";
import { buildIndex } from "./k8s.js";
import { ownershipLinker } from "./linkers/ownership.js";
import { selectorRoutingLinker } from "./linkers/selectorRouting.js";
import { configStorageLinker } from "./linkers/configStorage.js";

const LINKERS: Linker[] = [ownershipLinker, selectorRoutingLinker, configStorageLinker];

export function relate(objects: K8sObject[]): Edge[] {
  const idx = buildIndex(objects);
  const byId = new Map<string, Edge>();
  for (const linker of LINKERS) for (const e of linker(objects, idx)) if (!byId.has(e.id)) byId.set(e.id, e);
  return [...byId.values()];
}
