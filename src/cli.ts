#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { run } from "./core/pipeline.js";

export function parseArgs(argv: string[]): { path?: string; out?: string } {
  const oi = argv.indexOf("-o");
  const out = oi >= 0 ? argv[oi + 1] : undefined;
  const path = argv.find((a, i) => !a.startsWith("-") && (oi < 0 || i !== oi + 1));
  return { path, out };
}

async function main() {
  const { path, out } = parseArgs(process.argv.slice(2));
  if (!path) { console.error("usage: kubeviz <path> [-o out.json]"); process.exit(2); }
  const model = await run(path);
  const json = JSON.stringify(model, null, 2);
  if (out) await writeFile(out, json); else process.stdout.write(json + "\n");
  console.error(`kubeviz: ${model.nodes.length} nodes, ${model.edges.length} edges, ${model.warnings.length} warnings`);
}
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error("kubeviz: " + e.message); process.exit(1); });
}
