// duru dev loop: core build once → plugin watch-build → auto-deploy into the
// local Headlamp plugins dir. See dev/headlamp.sh for the container half.
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, watch } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DIST = join(ROOT, "packages/plugin/dist");
const CORE_SRC = join(ROOT, "packages/core/src");
const OUT = join(process.env.HL_PLUGINS_DIR ?? join(ROOT, "dev/.headlamp/plugins"), "duru");

const deploy = () => {
  try {
    if (!existsSync(join(DIST, "main.js"))) return; // mid-rebuild window: vite deletes then rewrites
    mkdirSync(OUT, { recursive: true });
    copyFileSync(join(DIST, "main.js"), join(OUT, "main.js"));
    copyFileSync(join(ROOT, "packages/plugin/package.json"), join(OUT, "package.json"));
    console.log(`[dev] deployed → ${OUT}  (${new Date().toLocaleTimeString()})`);
  } catch (e) {
    console.warn(`[dev] deploy skipped (${e.code ?? e.message}) — will retry on next change`);
  }
};
const debounced = (ms, fn) => { let t; return () => { clearTimeout(t); t = setTimeout(fn, ms); }; };

console.log("[dev] building @duru/core…");
if (spawnSync("npm", ["run", "build", "--workspace", "@duru/core"], { cwd: ROOT, stdio: "inherit" }).status !== 0) process.exit(1);

// npm run start (NOT npx): lifecycle must run prestart/gen-styles on fresh clones.
const plugin = spawn("npm", ["run", "start", "--workspace", "headlamp-plugin-duru"], { cwd: ROOT, stdio: "inherit" });
plugin.on("exit", (code) => process.exit(code ?? 1));
process.on("SIGINT", () => { plugin.kill("SIGINT"); process.exit(0); });
process.on("SIGTERM", () => { plugin.kill("SIGTERM"); process.exit(0); });

// Initial deploy: fs.watch misses the first build, so poll for it, copy, THEN watch.
const waitForFirstBuild = setInterval(() => {
  if (!existsSync(join(DIST, "main.js"))) return;
  clearInterval(waitForFirstBuild);
  deploy();
  // Any event type (in-place rewrites surface as "rename" on some kernels); filter by filename only.
  watch(DIST, debounced(300, deploy));
  // Core edits (recursive: linkers/ is a subdir) → plain rebuild, never rm -rf dist
  // (vite watches packages/core/dist through the workspace symlink and re-bundles).
  watch(CORE_SRC, { recursive: true }, debounced(400, () => {
    console.log("[dev] core changed — rebuilding @duru/core…");
    spawnSync("npm", ["run", "build", "--workspace", "@duru/core"], { cwd: ROOT, stdio: "inherit" });
  }));
  console.log("[dev] watching. Edit away; refresh the Headlamp tab after each rebuild.");
}, 300);
