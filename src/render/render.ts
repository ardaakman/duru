import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { GraphModel } from "../core/types.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const TPL = join(HERE, "..", "..", "templates", "geist");

function read(f: string): string { return readFileSync(join(TPL, f), "utf8"); }
// Escape `<` so injected JSON can never break out of the <script> block (…</script>, <!--).
function jsonForScript(v: unknown): string { return JSON.stringify(v).replace(/</g, "\\u003c"); }
function escHtml(s: string): string { return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!)); }
// Literal token substitution. CRITICAL: split/join (NOT String.replace) — replace interprets
// `$&`/`$$`/`$'` in the replacement even for string patterns, corrupting minified JS / model values.
function put(html: string, token: string, value: string): string { return html.split(token).join(value); }

export function render(model: GraphModel, opts: { title?: string } = {}): string {
  let html = read("shell.html");
  html = put(html, "/*STYLES*/", read("styles.css"));
  html = put(html, "/*ENGINE*/", read("engine.bundle.js"));
  html = put(html, "<title>kubeviz — Kubernetes map</title>", "<title>" + escHtml(opts.title || "kubeviz — Kubernetes map") + "</title>");
  // MODEL is (potentially untrusted) content — inject LAST so no later put() can scan/corrupt it.
  html = put(html, "/*MODEL*/", jsonForScript(model));
  return html;
}
