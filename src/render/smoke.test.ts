import { test, expect } from "vitest";
import { writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../core/pipeline.js";
import { render } from "./render.js";

test("emitted HTML mounts in a browser with no console errors and inspector opens", async () => {
  let puppeteer: any;
  try { puppeteer = (await import("puppeteer")).default; } catch { console.warn("puppeteer absent — skipping"); return; }
  let browser: any;
  try { browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--allow-file-access-from-files"] }); }
  catch { console.warn("chromium launch failed — skipping"); return; }
  try {
    const model = await run("fixtures/raw/app.yaml");
    const html = render(model);
    const dir = await mkdtemp(join(tmpdir(), "kv-"));
    const file = join(dir, "map.html");
    await writeFile(file, html);
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e: any) => errors.push(String(e.message)));
    page.on("console", (m: any) => { if (m.type() === "error") errors.push(m.text()); });
    await page.goto("file://" + file, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1200));
    const stats = await page.evaluate(() => ({
      nodes: (window as any).__cy ? (window as any).__cy.nodes('[resource]').length : -1,
      canvas: !!document.querySelector("#cy canvas"),
      kindRows: document.querySelectorAll("#kinds .row").length,
    }));
    // click the first node -> inspector shows
    await page.evaluate(() => { const cy = (window as any).__cy; cy.nodes('[resource]')[0].emit("tap"); });
    await new Promise((r) => setTimeout(r, 200));
    const inspectorShown = await page.evaluate(() => document.getElementById("detail")!.classList.contains("show"));
    expect(errors, "console/page errors: " + errors.join(" | ")).toEqual([]);
    expect(stats.canvas).toBe(true);
    expect(stats.nodes).toBe(model.nodes.length);
    expect(stats.kindRows).toBeGreaterThan(0);
    expect(inspectorShown).toBe(true);
  } finally { await browser.close(); }
}, 60000);

test("model values cannot XSS the rendered page (legends + attributes escape)", async () => {
  let puppeteer: any;
  try { puppeteer = (await import("puppeteer")).default; } catch { console.warn("puppeteer absent — skipping"); return; }
  let browser: any;
  try { browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--allow-file-access-from-files"] }); }
  catch { console.warn("chromium launch failed — skipping"); return; }
  try {
    const g = 'shop"><img src=y onerror="window.__x2=1">';
    const model: any = {
      nodes: [{ id: "x", kind: 'Evil<img src=x onerror="window.__x1=1">', name: "n", ns: "shop", group: g,
        icon: "crd", accent: "#8f8f8f", tier: 2, summary: "s", manifest: "kind: Evil\n" }],
      edges: [], groups: [{ id: g, label: g }], warnings: [],
    };
    const dir = await mkdtemp(join(tmpdir(), "kv-xss-"));
    const file = join(dir, "x.html");
    await writeFile(file, render(model));
    const page = await browser.newPage();
    await page.goto("file://" + file, { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 800));
    const r = await page.evaluate(() => ({ x1: (window as any).__x1, x2: (window as any).__x2,
      imgs: document.querySelectorAll("#kinds img, #namespaces img").length }));
    expect(r.x1, "kind legend XSS executed").toBeUndefined();
    expect(r.x2, "namespace legend XSS executed").toBeUndefined();
    expect(r.imgs, "injected <img> in legends").toBe(0);
  } finally { await browser.close(); }
}, 60000);
