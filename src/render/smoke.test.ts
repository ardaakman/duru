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
