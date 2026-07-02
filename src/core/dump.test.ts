import { test, expect } from "vitest";
import { run } from "./pipeline.js";

test("dump JSON → full ownership tree with parentId chain and health", async () => {
  const m = await run("fixtures/dump/app.json");
  const byId = new Map(m.nodes.map((n) => [n.id, n]));
  const dep = m.nodes.find((n) => n.kind === "Deployment")!;
  const rs = m.nodes.find((n) => n.kind === "ReplicaSet")!;
  const pods = m.nodes.filter((n) => n.kind === "Pod");
  expect(rs.parentId).toBe(dep.id);
  expect(pods.every((p) => p.parentId === rs.id)).toBe(true);
  expect(dep.health).toBe("ok");
  expect(pods.find((p) => p.name.endsWith("-b"))!.health).toBe("warn"); // Pending
  expect(m.nodes.some((n) => n.kind === "Namespace")).toBe(false);       // dropped → group root
});
