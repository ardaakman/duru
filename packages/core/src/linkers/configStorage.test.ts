import { test, expect } from "vitest";
import { configStorageLinker } from "./configStorage.js";
import { buildIndex } from "../k8s.js";
import { mk } from "../testutil.js";

test("workload mounts configmap, secret, pvc and uses SA; PVC->StorageClass", () => {
  const dep = mk({ uid: "ns/apps/Deployment/d", kind: "Deployment", namespace: "ns", name: "d", spec: { template: { spec: {
    serviceAccountName: "sa",
    volumes: [{ configMap: { name: "cm" } }, { secret: { secretName: "sec" } }, { persistentVolumeClaim: { claimName: "pvc" } }],
    containers: [{ envFrom: [{ configMapRef: { name: "cm2" } }] }],
  } } } });
  const objs = [dep,
    mk({ uid: "ns/core/ConfigMap/cm", kind: "ConfigMap", namespace: "ns", name: "cm" }),
    mk({ uid: "ns/core/ConfigMap/cm2", kind: "ConfigMap", namespace: "ns", name: "cm2" }),
    mk({ uid: "ns/core/Secret/sec", kind: "Secret", namespace: "ns", name: "sec" }),
    mk({ uid: "ns/core/ServiceAccount/sa", kind: "ServiceAccount", namespace: "ns", name: "sa" }),
    mk({ uid: "ns/core/PersistentVolumeClaim/pvc", kind: "PersistentVolumeClaim", namespace: "ns", name: "pvc", spec: { storageClassName: "fast" } }),
    mk({ uid: "_/storage.k8s.io/StorageClass/fast", kind: "StorageClass", name: "fast" }),
  ];
  const edges = configStorageLinker(objs, buildIndex(objs));
  const ids = edges.map((e) => `${e.type}:${e.source}->${e.target}`);
  expect(ids).toContain("mounts:ns/apps/Deployment/d->ns/core/ConfigMap/cm");
  expect(ids).toContain("mounts:ns/apps/Deployment/d->ns/core/ConfigMap/cm2");
  expect(ids).toContain("mounts:ns/apps/Deployment/d->ns/core/Secret/sec");
  expect(ids).toContain("mounts:ns/apps/Deployment/d->ns/core/PersistentVolumeClaim/pvc");
  expect(ids).toContain("uses:ns/apps/Deployment/d->ns/core/ServiceAccount/sa");
  expect(ids).toContain("class:ns/core/PersistentVolumeClaim/pvc->_/storage.k8s.io/StorageClass/fast");
});
