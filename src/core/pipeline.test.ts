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
