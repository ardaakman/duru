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
    // clicking a chip reveals its (collapsed) target → more cards become visible
    const before = await page.evaluate(() => document.querySelectorAll(".kv-card").length);
    await page.evaluate(() => (document.querySelector(".kv-inspector .kv-relchip") as HTMLElement).click());
    await new Promise((r) => setTimeout(r, 600));
    const after = await page.evaluate(() => document.querySelectorAll(".kv-card").length);
    expect(after).toBeGreaterThan(before);
  } finally { await browser.close(); }
}, 60000);
