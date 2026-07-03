import type { GraphModel, RawDoc } from "@duru/core";
import { buildModel,normalize, relate } from "@duru/core";

// Live objects (KubeObject.jsonData) are plain k8s JSON — the same shape the
// dump adapter consumed. No file provenance in live mode.
export function toRawDocs(lists: (any[] | null)[]): RawDoc[] {
  const out: RawDoc[] = [];
  for (const list of lists) if (list) for (const obj of list) out.push({ obj });
  return out;
}

// One candidate model from the current hook snapshot. manifests:false is the
// live-mode contract (§7): no YAML embedding, no secret content in the model.
export function buildLiveModel(lists: (any[] | null)[], hookWarnings: string[]): GraphModel {
  const { objects, warnings } = normalize(toRawDocs(lists));
  const edges = relate(objects);
  return buildModel(objects, edges, [...warnings, ...hookWarnings], { manifests: false });
}
