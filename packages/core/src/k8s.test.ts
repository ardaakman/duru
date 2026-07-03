import { test, expect } from "vitest";
import { splitApiVersion, makeUid, dedupeKey, redactSecret, matchesSelector, podSpecOf } from "./k8s.js";

test("splitApiVersion handles core and grouped", () => {
  expect(splitApiVersion("v1")).toEqual(["", "v1"]);
  expect(splitApiVersion("apps/v1")).toEqual(["apps", "v1"]);
});
test("makeUid prefers metaUid then synthesizes, cluster-scoped uses _", () => {
  expect(makeUid({ kind: "Pod", namespace: "a", name: "p", metaUid: "u1" })).toBe("u1");
  expect(makeUid({ group: "apps", kind: "Deployment", namespace: "a", name: "d" })).toBe("a/apps/Deployment/d");
  expect(makeUid({ kind: "Node", name: "n1" })).toBe("_/core/Node/n1");
});
test("dedupeKey ignores metaUid", () => {
  expect(dedupeKey({ group: "", kind: "Service", namespace: "a", name: "s" })).toBe("core/Service/a/s");
});
test("redactSecret masks data and stringData only for Secrets", () => {
  const s = redactSecret({ kind: "Secret", data: { a: "aGk=" }, stringData: { b: "hi" } });
  expect(s.data.a).toBe("<redacted>");
  expect(s.stringData.b).toBe("<redacted>");
  const cm = redactSecret({ kind: "ConfigMap", data: { a: "x" } });
  expect(cm.data.a).toBe("x");
});
test("matchesSelector is subset match", () => {
  expect(matchesSelector({ app: "x", tier: "y" }, { app: "x" })).toBe(true);
  expect(matchesSelector({ app: "x" }, { app: "z" })).toBe(false);
  expect(matchesSelector({ app: "x" }, {})).toBe(false); // empty selector matches nothing
});
test("podSpecOf reads workload template and bare pod", () => {
  expect(podSpecOf({ kind: "Deployment", spec: { template: { spec: { x: 1 } } } } as any)).toEqual({ x: 1 });
  expect(podSpecOf({ kind: "Pod", spec: { y: 2 } } as any)).toEqual({ y: 2 });
});
