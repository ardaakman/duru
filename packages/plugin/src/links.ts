import { Router } from "@kinvolk/headlamp-plugin/lib";
import type { Node } from "@duru/core";

// Headlamp route names for built-in details pages. VERIFIED AT IMPLEMENTATION TIME
// against node_modules/@kinvolk/headlamp-plugin/lib: KubeObject.detailsRoute defaults
// to `this.kind` (KubeObject.js) for every one of these built-in classes (none override
// it), and createRouteURL/getRoute resolve route names case-insensitively
// (`route.name?.toLowerCase() === routeName.toLowerCase()`). So these camelCase values
// resolve to the same registered route as the PascalCase Kind string in every case
// (e.g. "horizontalPodAutoscaler" == "HorizontalPodAutoscaler".toLowerCase()).
const ROUTE: Record<string, string> = {
  Pod: "pod", Deployment: "deployment", ReplicaSet: "replicaSet", StatefulSet: "statefulSet",
  DaemonSet: "daemonSet", Job: "job", CronJob: "cronJob", Service: "service", Ingress: "ingress",
  ConfigMap: "configMap", Secret: "secret", PersistentVolumeClaim: "persistentVolumeClaim",
  PersistentVolume: "persistentVolume", StorageClass: "storageClass", ServiceAccount: "serviceAccount",
  HorizontalPodAutoscaler: "horizontalPodAutoscaler", NetworkPolicy: "networkPolicy", Node: "node",
};

export function detailsUrl(n: Node): string | null {
  const route = ROUTE[n.kind];
  if (!route || !Router?.createRouteURL) return null;
  try {
    return n.ns ? Router.createRouteURL(route, { namespace: n.ns, name: n.name })
                : Router.createRouteURL(route, { name: n.name });
  } catch {
    return null;
  }
}
