import { test, expect } from "vitest";
import { render } from "./render.js";
import type { GraphModel } from "../core/types.js";

const model: GraphModel = {
  nodes: [{ id: "ns/apps/Deployment/web", kind: "Deployment", name: "web", ns: "demo", group: "demo",
    icon: "deployment", accent: "#171717", tier: 2, summary: "Deployment", health: "unknown", manifest: "kind: Deployment\n" }],
  edges: [], groups: [{ id: "demo", label: "demo" }], warnings: [],
};

test("render produces one self-contained HTML doc containing the model and bundle", () => {
  const html = render(model, { title: "t" });
  expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
  expect(html).toContain('id="root"');
  expect(html).toContain('id="duru-model"');
  expect(html).toContain("ns/apps/Deployment/web");   // model injected
  expect(html).toContain("controllers");               // bundle inlined (Legend family label survives minify)
  expect(html).not.toContain("/*MODEL*/");            // token replaced
  expect(html).not.toContain("/*ENGINE*/");           // token replaced
  expect(html).not.toContain("<script src");          // nothing external
  expect(html).not.toContain("<link");                // no external stylesheet (CSS is inlined)
  expect(html).toContain("<title>t</title>");
});

test("injection-safe: </script> in model can't break out of the model block", () => {
  const m: GraphModel = { nodes: [{ id: "x", kind: "ConfigMap", name: "c", ns: "d", group: "d",
    icon: "configmap", accent: "#f5a623", tier: 3, summary: "ConfigMap", health: "unknown",
    manifest: "data:\n  a: \"</script><b>pwn</b> $& $$USD\"\n" }],
    edges: [], groups: [{ id: "d", label: "d" }], warnings: [] };
  const html = render(m);
  expect(html).not.toContain("</script><b>pwn");   // did NOT break out raw
  expect(html).toContain("\\u003c/script>");        // present only in escaped form
  expect(html).toContain("controllers");            // bundle survived (split/join kept $&/$$)
});
