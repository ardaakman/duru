import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { GraphModel } from "../core/types.js";
import { GLYPH } from "./icons.js";

const HERE = dirname(fileURLToPath(import.meta.url));
// src/render -> repo root -> templates/geist
const TPL = join(HERE, "..", "..", "templates", "geist");
const VENDOR = ["cytoscape.min.js", "dagre.min.js", "cytoscape-dagre.min.js", "layout-base.min.js", "cose-base.min.js", "cytoscape-fcose.min.js"];

function read(f: string): string { return readFileSync(join(TPL, f), "utf8"); }
// Escape `<` so injected JSON can never break out of a <script> (…</script>, <!--).
function jsonForScript(v: unknown): string { return JSON.stringify(v).replace(/</g, "\\u003c"); }
function escHtml(s: string): string { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!)); }
// Literal token substitution. CRITICAL: use split/join (NOT String.replace) — replace
// interprets `$&`/`$$`/`$'` in the replacement even when the pattern is a string, which
// would silently corrupt minified vendor JS (contains `$&`) and model values (contains `$$`).
function put(html: string, token: string, value: string): string { return html.split(token).join(value); }

export function render(model: GraphModel, opts: { title?: string } = {}): string {
  let html = read("shell.html");
  html = put(html, "/*STYLES*/", read("styles.css"));
  html = put(html, "/*VENDOR*/", VENDOR.map((f) => read(join("vendor", f))).join("\n;\n"));
  html = put(html, "/*ICONS*/", jsonForScript(GLYPH));
  html = put(html, "/*ENGINE*/", read("engine.js"));
  html = put(html, "<title>kubeviz — Kubernetes map</title>", "<title>" + escHtml(opts.title || "kubeviz — Kubernetes map") + "</title>");
  // MODEL is (potentially untrusted) content — inject it LAST so no later put() can scan/corrupt it.
  html = put(html, "/*MODEL*/", jsonForScript(model));
  return html;
}
