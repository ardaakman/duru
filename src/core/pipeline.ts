import type { GraphModel } from "./types.js";
import { ingest } from "./ingest.js";
import { normalize } from "./normalize.js";
import { relate } from "./relate.js";
import { buildModel } from "./model.js";

export async function run(path: string): Promise<GraphModel> {
  const docs = await ingest(path);
  const { objects, warnings } = normalize(docs);
  const edges = relate(objects);
  return buildModel(objects, edges, warnings);
}
