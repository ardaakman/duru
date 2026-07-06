#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { run } from "./core/pipeline.js";
import { render } from "./render/render.js";

// Flags that consume the FOLLOWING token as their value. Later plans register
// --values/--set/--namespace/--title here so their values are never misread as the path.
const VALUE_FLAGS = new Set(["-o", "--output"]);
export function parseArgs(argv: string[]): { path?: string; out?: string; format?: "html" | "json"; slim?: boolean } {
  const consumed = new Set<number>();
  let out: string | undefined;
  argv.forEach((a, i) => { if (VALUE_FLAGS.has(a)) { consumed.add(i + 1); if (a === "-o" || a === "--output") out = argv[i + 1]; } });
  const path = argv.find((a, i) => !a.startsWith("-") && !consumed.has(i));
  const format = argv.includes("--html") ? "html" : argv.includes("--json") ? "json" : undefined;
  return { path, out, format, slim: argv.includes("--slim") };
}

export function chooseFormat(a: { out?: string; format?: "html" | "json" }): "html" | "json" {
  if (a.format) return a.format;
  if (a.out && a.out.endsWith(".html")) return "html";
  return "json";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.path) { console.error("usage: duru <path> [--output|-o <out.html|out.json>] [--html|--json] [--slim]"); process.exit(2); }
  const model = await run(args.path);
  if (args.slim) for (const n of model.nodes) delete n.manifest; // §5: opt-out of embedded manifests
  const fmt = chooseFormat(args);
  const output = fmt === "html" ? render(model, { title: "duru — " + args.path }) : JSON.stringify(model, null, 2);
  if (fmt === "html" && !args.slim && output.length > 5 * 1024 * 1024)
    console.error("duru: output is " + (output.length / 1024 / 1024).toFixed(1) + " MB — consider --slim to omit embedded manifests");
  if (args.out) await writeFile(args.out, output); else process.stdout.write(output + "\n");
  console.error("duru: " + model.nodes.length + " nodes, " + model.edges.length + " edges, " + model.warnings.length + " warnings" + (args.out ? " -> " + args.out + " (" + fmt + ")" : ""));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error("duru: " + e.message); process.exit(1); });
}
