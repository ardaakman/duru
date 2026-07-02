import { test, expect } from "vitest";
import { writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../core/pipeline.js";
import { render } from "./render.js";

async function launch() {
  let puppeteer: any;
  try { puppeteer = (await import("puppeteer")).default; } catch { return null; }
  try { return await puppeteer.launch({ headless: "new", args: ["--no-sandbox", "--allow-file-access-from-files"] }); }
  catch { return null; }
}
async function pageFor(browser: any, html: string) {
  const dir = await mkdtemp(join(tmpdir(), "kv-"));
  const file = join(dir, "map.html");
  await writeFile(file, html);
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e: any) => errors.push(String(e.message)));
  page.on("console", (m: any) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("file://" + file, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  return { page, errors };
}

test("tree mounts in a browser with no console errors and renders the visible cards", async () => {
  const browser = await launch();
  if (!browser) { console.warn("puppeteer/chromium unavailable — skipping"); return; }
  try {
    const model = await run("fixtures/raw/app.yaml");
    const { page, errors } = await pageFor(browser, render(model));
    const cards = await page.evaluate(() => document.querySelectorAll(".kv-card").length);
    const legend = await page.evaluate(() => document.querySelectorAll(".kv-legend").length);
    expect(errors, "console/page errors: " + errors.join(" | ")).toEqual([]);
    expect(cards).toBeGreaterThan(0);
    expect(legend).toBe(1);
  } finally { await browser.close(); }
}, 60000);

test("collapse chip toggles the visible card count", async () => {
  const browser = await launch();
  if (!browser) { console.warn("puppeteer/chromium unavailable — skipping"); return; }
  try {
    const model = await run("fixtures/dump/app.json");
    const { page } = await pageFor(browser, render(model));
    const before = await page.evaluate(() => document.querySelectorAll(".kv-card").length);
    const clicked = await page.evaluate(() => { const c = document.querySelector(".kv-chip") as HTMLElement | null; if (c) { c.click(); return true; } return false; });
    await new Promise((r) => setTimeout(r, 500));
    const after = await page.evaluate(() => document.querySelectorAll(".kv-card").length);
    expect(clicked).toBe(true);
    expect(after).not.toBe(before);
  } finally { await browser.close(); }
}, 60000);

test("double-clicking a parent drills in and shows a breadcrumb", async () => {
  const browser = await launch();
  if (!browser) { console.warn("puppeteer/chromium unavailable — skipping"); return; }
  try {
    const model = await run("fixtures/dump/app.json");
    const { page } = await pageFor(browser, render(model));
    // double-click the first card that shows a collapse chip (i.e. has children)
    await page.evaluate(() => {
      const chip = document.querySelector(".kv-chip");
      const card = chip ? chip.closest(".kv-card") : document.querySelector(".kv-card");
      const ev = new MouseEvent("dblclick", { bubbles: true });
      card!.dispatchEvent(ev);
    });
    await new Promise((r) => setTimeout(r, 700));
    const crumbs = await page.evaluate(() => document.querySelectorAll(".kv-crumb").length);
    expect(crumbs).toBeGreaterThan(0);
  } finally { await browser.close(); }
}, 60000);

test("inspector renders relationship chips and a chip reveals its hidden target", async () => {
  const browser = await launch();
  if (!browser) { console.warn("puppeteer/chromium unavailable — skipping"); return; }
  try {
    const model = await run("fixtures/dump/app.json");
    const { page } = await pageFor(browser, render(model));
    // click the Service card (its badge text is "svc")
    const clickedSvc = await page.evaluate(() => {
      const card = [...document.querySelectorAll(".kv-card")].find((c) => c.querySelector(".kv-badge")?.textContent === "svc");
      if (!card) return false; (card as HTMLElement).click(); return true;
    });
    await new Promise((r) => setTimeout(r, 300));
    const chips = await page.evaluate(() => document.querySelectorAll(".kv-inspector .kv-relchip").length);
    expect(clickedSvc, "no Service card found").toBe(true);
    expect(chips, "inspector rendered no relationship chips").toBeGreaterThan(0);
    // clicking a chip reveals its (collapsed) target and selects it (§2.1 reveal contract).
    // Note: reveal() also re-centers the viewport tightly on the target (this task's focus
    // contract), and with onlyRenderVisibleElements that legitimately virtualizes distant
    // cards (e.g. the clicked Service) out of the DOM — so "total card count" is no longer
    // a valid proxy here. Assert the real invariant instead: the target itself is rendered
    // and marked selected.
    const chipName = await page.evaluate(() => document.querySelector(".kv-inspector .kv-relchip")!.textContent);
    await page.evaluate(() => (document.querySelector(".kv-inspector .kv-relchip") as HTMLElement).click());
    await new Promise((r) => setTimeout(r, 600));
    const sel = await page.evaluate(() => document.querySelector(".kv-card.sel")?.textContent ?? null);
    expect(sel, "chip did not reveal+select its target").toContain(chipName);
  } finally { await browser.close(); }
}, 60000);

test("model values cannot XSS the rendered page (React escapes text)", async () => {
  const browser = await launch();
  if (!browser) { console.warn("puppeteer/chromium unavailable — skipping"); return; }
  try {
    const evil = 'Evil<img src=x onerror="window.__x1=1">';
    const model: any = {
      nodes: [{ id: "x", kind: evil, name: 'n"><img src=y onerror="window.__x2=1">', ns: "shop", group: "shop",
        icon: "crd", accent: "#8f8f8f", tier: 2, summary: "s", health: "unknown", manifest: "kind: Evil\n" }],
      edges: [], groups: [{ id: "shop", label: "shop" }], warnings: [],
    };
    const { page } = await pageFor(browser, render(model));
    const r = await page.evaluate(() => ({
      x1: (window as any).__x1, x2: (window as any).__x2,
      imgs: document.querySelectorAll(".kv-card img, .kv-inspector img").length,
    }));
    expect(r.x1, "kind XSS executed").toBeUndefined();
    expect(r.x2, "name XSS executed").toBeUndefined();
    expect(r.imgs, "injected <img> rendered").toBe(0);
  } finally { await browser.close(); }
}, 60000);

test("collapsed ancestor surfaces a hidden crashing pod as a red dot", async () => {
  const browser = await launch();
  if (!browser) { console.warn("puppeteer/chromium unavailable — skipping"); return; }
  try {
    const model = await run("fixtures/dump/app.json");
    const { page } = await pageFor(browser, render(model));
    // RS has 4 pods → collapsed by default; pod web-7c9d-d is CrashLoopBackOff.
    const dot = await page.evaluate(() => {
      const card = [...document.querySelectorAll(".kv-card")].find((c) => c.textContent!.includes("web-7c9d"));
      return card ? getComputedStyle(card.querySelector(".kv-dot")!).backgroundColor : null;
    });
    expect(dot).toBe("rgb(229, 72, 77)"); // #e5484d — error bubbled up through the collapse
  } finally { await browser.close(); }
}, 60000);

test("search reveals a node buried under a collapsed ancestor and selects it", async () => {
  const browser = await launch();
  if (!browser) { console.warn("puppeteer/chromium unavailable — skipping"); return; }
  try {
    const model = await run("fixtures/dump/app.json");
    const { page } = await pageFor(browser, render(model));
    // web-7c9d-d is hidden under the default-collapsed ReplicaSet.
    await page.type(".kv-search", "web-7c9d-d");
    await new Promise((r) => setTimeout(r, 200));
    await page.keyboard.press("Enter");
    await new Promise((r) => setTimeout(r, 700));
    const sel = await page.evaluate(() => {
      const card = document.querySelector(".kv-card.sel");
      return card ? card.textContent : null;
    });
    expect(sel, "search did not reveal+select the buried pod").toContain("web-7c9d-d");
  } finally { await browser.close(); }
}, 60000);

test("Escape closes the inspector", async () => {
  const browser = await launch();
  if (!browser) { console.warn("puppeteer/chromium unavailable — skipping"); return; }
  try {
    const model = await run("fixtures/dump/app.json");
    const { page } = await pageFor(browser, render(model));
    // Click a REAL resource card (svc has a manifest) — not the first card, which is the
    // synthetic namespace root; Task 6 appends a copy-button assertion that needs a manifest.
    await page.evaluate(() => {
      const card = [...document.querySelectorAll(".kv-card")].find((c) => c.querySelector(".kv-badge")?.textContent === "svc");
      (card as HTMLElement).click();
    });
    await new Promise((r) => setTimeout(r, 300));
    await page.keyboard.press("Escape");
    await new Promise((r) => setTimeout(r, 300));
    const open = await page.evaluate(() => document.querySelectorAll(".kv-inspector").length);
    expect(open).toBe(0);
  } finally { await browser.close(); }
}, 60000);
