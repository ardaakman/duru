import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { parseAllDocuments } from "yaml";
import type { RawDoc } from "./types.js";

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else if (/\.ya?ml$/.test(entry.name)) out.push(p);
  }
  return out;
}
function offsetToLine(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) if (text[i] === "\n") line++;
  return line;
}
async function rawFile(file: string): Promise<RawDoc[]> {
  const text = await readFile(file, "utf8");
  const docs = parseAllDocuments(text);
  const out: RawDoc[] = [];
  for (const d of docs) {
    const obj = d.toJS();
    if (obj == null) continue;
    const start = d.range?.[0] ?? 0;
    out.push({ obj, source: { file, line: offsetToLine(text, start) } });
  }
  return out;
}

export async function ingest(path: string): Promise<RawDoc[]> {
  const st = await stat(path);
  if (st.isFile() && path.endsWith(".json")) {
    const json = JSON.parse(await readFile(path, "utf8"));
    if (json?.kind === "List" && Array.isArray(json.items)) return json.items.map((obj: any) => ({ obj }));
    return [{ obj: json }];
  }
  const files = st.isDirectory() ? await walk(path) : [path];
  const out: RawDoc[] = [];
  for (const f of files) out.push(...(await rawFile(f)));
  return out;
}
