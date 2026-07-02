import { test, expect } from "vitest";
import { deriveHealth } from "./health.js";
import { mk } from "./testutil.js";

test("running+ready pod → ok; pending → warn; failed/crashloop → error", () => {
  const ready = mk({ uid: "ns/core/Pod/a", kind: "Pod", namespace: "ns", name: "a" });
  ready.status = { phase: "Running", containerStatuses: [{ ready: true }] };
  const pending = mk({ uid: "ns/core/Pod/b", kind: "Pod", namespace: "ns", name: "b" });
  pending.status = { phase: "Pending" };
  const crash = mk({ uid: "ns/core/Pod/c", kind: "Pod", namespace: "ns", name: "c" });
  crash.status = { phase: "Running", containerStatuses: [{ ready: false, state: { waiting: { reason: "CrashLoopBackOff" } } }] };
  expect(deriveHealth(ready)).toBe("ok");
  expect(deriveHealth(pending)).toBe("warn");
  expect(deriveHealth(crash)).toBe("error");
});

test("workload availability: all→ok, partial→warn, zero→error", () => {
  const ok = mk({ uid: "ns/apps/Deployment/d1", kind: "Deployment", namespace: "ns", name: "d1", spec: { replicas: 3 } });
  ok.status = { replicas: 3, availableReplicas: 3 };
  const partial = mk({ uid: "ns/apps/Deployment/d2", kind: "Deployment", namespace: "ns", name: "d2", spec: { replicas: 3 } });
  partial.status = { replicas: 3, availableReplicas: 1 };
  const zero = mk({ uid: "ns/apps/Deployment/d3", kind: "Deployment", namespace: "ns", name: "d3", spec: { replicas: 3 } });
  zero.status = { replicas: 3, availableReplicas: 0 };
  expect(deriveHealth(ok)).toBe("ok");
  expect(deriveHealth(partial)).toBe("warn");
  expect(deriveHealth(zero)).toBe("error");
});

test("no status (manifest) → unknown", () => {
  const dep = mk({ uid: "ns/apps/Deployment/d", kind: "Deployment", namespace: "ns", name: "d", spec: { replicas: 2 } });
  expect(deriveHealth(dep)).toBe("unknown");
});
