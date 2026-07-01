import { test, expect } from "vitest";
import { GLYPH, iconDataUri } from "./icons.js";

test("GLYPH has every icon key kubeviz-core emits", () => {
  const required = ["deployment","statefulset","daemonset","job","pod","service","ingress","configmap","secret","key","pvc","storageclass","node","shield","hpa","crd"];
  for (const k of required) expect(GLYPH[k], `missing glyph: ${k}`).toBeTruthy();
});
test("iconDataUri encodes an svg with the color; unknown key falls back to crd", () => {
  const uri = iconDataUri("service", "#0070f3");
  expect(uri.startsWith("data:image/svg+xml;utf8,")).toBe(true);
  expect(decodeURIComponent(uri)).toContain("#0070f3");
  expect(decodeURIComponent(uri)).toContain("<svg");
  const fb = iconDataUri("no-such-kind", "#171717");
  expect(decodeURIComponent(fb)).toContain(GLYPH.crd);
});
