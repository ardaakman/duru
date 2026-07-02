import type { K8sObject, Health } from "./types.js";

const WORKLOADS = new Set(["Deployment", "ReplicaSet", "StatefulSet", "DaemonSet", "ReplicationController"]);

function podHealth(st: any): Health {
  const phase = st.phase;
  if (phase === "Failed") return "error";
  const cs: any[] = st.containerStatuses ?? [];
  const crash = cs.some((c) => c?.state?.waiting?.reason && /CrashLoopBackOff|Error|ImagePullBackOff/.test(c.state.waiting.reason));
  if (crash) return "error";
  if (phase === "Pending") return "warn";
  if (phase === "Succeeded") return "ok";
  if (phase === "Running") return cs.length && cs.every((c) => c?.ready) ? "ok" : "warn";
  return "unknown";
}

function workloadHealth(o: K8sObject): Health {
  const st = o.status ?? {};
  const desired = st.replicas ?? st.desiredNumberScheduled ?? o.spec?.replicas;
  const avail = st.availableReplicas ?? st.numberAvailable ?? st.readyReplicas;
  if (typeof desired !== "number" || typeof avail !== "number") return "unknown";
  if (avail >= desired && desired > 0) return "ok";
  if (avail <= 0) return "error";
  return "warn";
}

export function deriveHealth(o: K8sObject): Health {
  if (!o.status) return "unknown";
  if (o.kind === "Pod") return podHealth(o.status);
  if (WORKLOADS.has(o.kind)) return workloadHealth(o);
  return "unknown";
}
