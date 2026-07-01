#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { run } from "./core/pipeline.js";

async function main() {
  const args = process.argv.slice(2);
  const path = args.find((a) => !a.startsWith("-"));
  const oi = args.indexOf("-o");
  const out = oi >= 0 ? args[oi + 1] : undefined;
  if (!path) { console.error("usage: kubeviz <path> [-o out.json]"); process.exit(2); }
  const model = await run(path);
  const json = JSON.stringify(model, null, 2);
  if (out) await writeFile(out, json); else process.stdout.write(json + "\n");
  console.error(`kubeviz: ${model.nodes.length} nodes, ${model.edges.length} edges, ${model.warnings.length} warnings`);
}
main().catch((e) => { console.error("kubeviz: " + e.message); process.exit(1); });
