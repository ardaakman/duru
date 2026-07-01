import { test, expect } from "vitest";
import { parseArgs, chooseFormat } from "./cli.js";

test("parseArgs handles both orderings", () => {
  expect(parseArgs(["a.yaml", "-o", "o.json"])).toEqual({ path: "a.yaml", out: "o.json" });
  expect(parseArgs(["-o", "o.json", "a.yaml"])).toEqual({ path: "a.yaml", out: "o.json" });
  expect(parseArgs(["a.yaml"])).toEqual({ path: "a.yaml", out: undefined });
});

test("chooseFormat: -o extension decides, flags override, default json", () => {
  expect(chooseFormat({ out: "map.html" })).toBe("html");
  expect(chooseFormat({ out: "m.json" })).toBe("json");
  expect(chooseFormat({ out: "map.html", format: "json" })).toBe("json");
  expect(chooseFormat({})).toBe("json");
});
test("parseArgs reads --html/--json and never treats a flag value as the path", () => {
  expect(parseArgs(["a.yaml", "--html", "-o", "x"]).format).toBe("html");
  expect(parseArgs(["a.yaml", "--json"]).format).toBe("json");
  expect(parseArgs(["-o", "out.html", "a.yaml"]).path).toBe("a.yaml"); // -o's value isn't misread as path
  expect(parseArgs(["a.yaml", "--output", "m.html"]).out).toBe("m.html"); // --output alias
});
