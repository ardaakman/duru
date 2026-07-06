// @vitest-environment jsdom
import { expect,test } from "vitest";
import { injectTypeMeta, pickVersion } from "./crds";

const crd = {
  spec: {
    group: "thunder.dev", names: { kind: "Widget", plural: "widgets" }, scope: "Namespaced",
    versions: [
      { name: "v1alpha1", served: true, storage: false },
      { name: "v1", served: true, storage: true },
      { name: "v2beta", served: false, storage: false },
    ],
  },
};

test("pickVersion prefers served+storage, falls back to first served, null when none", () => {
  expect(pickVersion(crd)).toBe("v1");
  expect(pickVersion({ spec: { versions: [{ name: "a", served: true, storage: false }] } })).toBe("a");
  expect(pickVersion({ spec: { versions: [{ name: "a", served: false }] } })).toBe(null);
});

test("injectTypeMeta fills missing kind/apiVersion, preserves present ones", () => {
  const items = [{ metadata: { name: "w1" } }, { kind: "Widget", apiVersion: "thunder.dev/v1", metadata: { name: "w2" } }];
  const out = injectTypeMeta(items, crd, "v1");
  expect(out[0].kind).toBe("Widget");
  expect(out[0].apiVersion).toBe("thunder.dev/v1");
  expect(out[1]).toBe(items[1]); // untouched reference when complete
});

test("injectTypeMeta completes PARTIAL type meta consistently (injection wins)", () => {
  const items = [{ kind: "Widget", metadata: { name: "w3" } }, { apiVersion: "thunder.dev/v1", metadata: { name: "w4" } }];
  const out = injectTypeMeta(items, crd, "v1");
  expect(out[0]).toMatchObject({ kind: "Widget", apiVersion: "thunder.dev/v1" });
  expect(out[1]).toMatchObject({ kind: "Widget", apiVersion: "thunder.dev/v1" });
});
