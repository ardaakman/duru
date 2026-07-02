export const FAMILY = {
  controllers: "#171717", pods: "#00a389", networking: "#0070f3",
  config: "#f5a623", storage: "#7928ca", secrets: "#eb367f", identity: "#8f8f8f",
} as const;

const MAP: Record<string, { abbr: string; family: keyof typeof FAMILY }> = {
  Namespace: { abbr: "ns", family: "identity" },
  Deployment: { abbr: "depl", family: "controllers" }, DaemonSet: { abbr: "ds", family: "controllers" },
  StatefulSet: { abbr: "sts", family: "controllers" }, Job: { abbr: "job", family: "controllers" },
  CronJob: { abbr: "cron", family: "controllers" }, ReplicationController: { abbr: "rc", family: "controllers" },
  ReplicaSet: { abbr: "rs", family: "pods" }, Pod: { abbr: "pod", family: "pods" },
  Service: { abbr: "svc", family: "networking" }, Ingress: { abbr: "ing", family: "networking" },
  Gateway: { abbr: "gw", family: "networking" }, HTTPRoute: { abbr: "rt", family: "networking" },
  NetworkPolicy: { abbr: "np", family: "networking" },
  ConfigMap: { abbr: "cm", family: "config" }, HorizontalPodAutoscaler: { abbr: "hpa", family: "config" },
  Secret: { abbr: "sec", family: "secrets" },
  PersistentVolumeClaim: { abbr: "pvc", family: "storage" }, PersistentVolume: { abbr: "pv", family: "storage" },
  StorageClass: { abbr: "sc", family: "storage" }, ServiceAccount: { abbr: "sa", family: "identity" },
};

export function badge(kind: string): { abbr: string; color: string } {
  const m = MAP[kind];
  if (m) return { abbr: m.abbr, color: FAMILY[m.family] };
  return { abbr: kind.slice(0, 4).toLowerCase(), color: FAMILY.identity };
}

export const HEALTH = { ok: "#2ea043", warn: "#f5a623", error: "#e5484d", unknown: "#c4c4c4" } as const;
