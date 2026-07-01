import { test, expect } from "vitest";
import { parseArgs } from "./cli.js";

test("parseArgs handles both orderings", () => {
  expect(parseArgs(["a.yaml", "-o", "o.json"])).toEqual({ path: "a.yaml", out: "o.json" });
  expect(parseArgs(["-o", "o.json", "a.yaml"])).toEqual({ path: "a.yaml", out: "o.json" });
  expect(parseArgs(["a.yaml"])).toEqual({ path: "a.yaml", out: undefined });
});
