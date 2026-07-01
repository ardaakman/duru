import { test, expect } from "vitest";
import { ownershipLinker } from "./ownership.js";
import { buildIndex } from "../k8s.js";
import { mk } from "../testutil.js";

test("links child to owner by kind+name in same namespace", () => {
  const rs = mk({ uid: "ns/apps/ReplicaSet/rs", kind: "ReplicaSet", namespace: "ns", name: "rs", ownerRefs: [{ kind: "Deployment", name: "d" }] });
  const dep = mk({ uid: "ns/apps/Deployment/d", kind: "Deployment", namespace: "ns", name: "d" });
  const edges = ownershipLinker([rs, dep], buildIndex([rs, dep]));
  expect(edges).toEqual([{ id: "owns:ns/apps/Deployment/d->ns/apps/ReplicaSet/rs", source: "ns/apps/Deployment/d", target: "ns/apps/ReplicaSet/rs", type: "owns", label: "owns" }]);
});
test("no edge when owner absent", () => {
  const rs = mk({ uid: "ns/apps/ReplicaSet/rs", kind: "ReplicaSet", namespace: "ns", name: "rs", ownerRefs: [{ kind: "Deployment", name: "gone" }] });
  expect(ownershipLinker([rs], buildIndex([rs]))).toEqual([]);
});
