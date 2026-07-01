import { test, expect } from "vitest";
import { ingest } from "./ingest.js";

test("raw adapter splits multi-doc YAML with file+line provenance", async () => {
  const docs = await ingest("fixtures/raw/app.yaml");
  expect(docs).toHaveLength(2);
  expect(docs[0].obj.kind).toBe("Deployment");
  expect(docs[0].source?.file).toContain("app.yaml");
  expect(typeof docs[0].source?.line).toBe("number");
  expect(docs[1].source?.line).toBeGreaterThan(docs[0].source!.line!);
});
test("dump adapter expands a List with no source", async () => {
  const docs = await ingest("fixtures/dump/cluster.json");
  expect(docs).toHaveLength(1);
  expect(docs[0].obj.kind).toBe("Pod");
  expect(docs[0].source).toBeUndefined();
});
