import { test, expect } from "vitest";
import { normalize } from "./normalize.js";

test("maps a doc to K8sObject with derived group and source", () => {
  const { objects } = normalize([{ obj: { apiVersion: "apps/v1", kind: "Deployment", metadata: { name: "m", namespace: "ns", labels: { app: "m" } }, spec: { replicas: 3 } }, source: { file: "d.yaml", line: 1 } }]);
  expect(objects).toHaveLength(1);
  expect(objects[0]).toMatchObject({ group: "apps", kind: "Deployment", namespace: "ns", name: "m", uid: "ns/apps/Deployment/m", source: { file: "d.yaml", line: 1 } });
  expect(objects[0].labels).toEqual({ app: "m" });
});
test("last-doc-wins on collision + warning", () => {
  const { objects, warnings } = normalize([
    { obj: { apiVersion: "v1", kind: "ConfigMap", metadata: { name: "c", namespace: "ns" }, data: { a: "1" } } },
    { obj: { apiVersion: "v1", kind: "ConfigMap", metadata: { name: "c", namespace: "ns" }, data: { a: "2" } } },
  ]);
  expect(objects).toHaveLength(1);
  expect(objects[0].raw.data.a).toBe("2");
  expect(warnings.some((w) => w.includes("collision"))).toBe(true);
});
test("redacts secret values and skips docs without kind/name", () => {
  const { objects } = normalize([
    { obj: { apiVersion: "v1", kind: "Secret", metadata: { name: "s", namespace: "ns" }, data: { p: "aGk=" } } },
    { obj: null },
    { obj: { kind: "Foo" } },
  ]);
  expect(objects).toHaveLength(1);
  expect(objects[0].raw.data.p).toBe("<redacted>");
});
