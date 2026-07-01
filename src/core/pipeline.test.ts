import { test, expect } from "vitest";
import { run } from "./pipeline.js";

test("run turns the raw fixture into a coherent GraphModel", async () => {
  const m = await run("fixtures/raw/app.yaml");
  const ids = m.nodes.map((n) => n.id);
  expect(ids).toContain("demo/apps/Deployment/web");
  expect(ids).toContain("demo/core/Service/web");
  // Service selects the Deployment (via pod-template labels)
  expect(m.edges.some((e) => e.type === "selects" && e.source === "demo/core/Service/web" && e.target === "demo/apps/Deployment/web")).toBe(true);
  expect(m.nodes.find((n) => n.id === "demo/apps/Deployment/web")?.count).toBe(2);
});

test("no secret value ever reaches the model", async () => {
  const { run } = await import("./pipeline.js");
  // reuse a temp dump with a Secret
  const { writeFile, mkdtemp } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = await mkdtemp(join(tmpdir(), "kv-"));
  await writeFile(join(dir, "s.yaml"), "apiVersion: v1\nkind: Secret\nmetadata: { name: s, namespace: ns }\ndata: { token: c2VjcmV0 }\n");
  const m = await run(join(dir, "s.yaml"));
  expect(JSON.stringify(m)).not.toContain("c2VjcmV0"); // value gone
  expect(m.nodes[0].manifest).toContain("<redacted>");
  expect(m.nodes[0].manifest).toContain("token"); // key name retained (educational, not a leak)
});
