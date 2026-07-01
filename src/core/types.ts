export interface K8sObject {
  uid: string; apiVersion: string; group: string; version: string; kind: string;
  namespace?: string; name: string;
  labels: Record<string, string>; annotations: Record<string, string>;
  ownerRefs: { kind: string; name: string; uid?: string }[];
  spec: any; raw: any; source?: { file: string; line?: number };
}
export interface RawDoc { obj: any; source?: { file: string; line?: number }; }
export interface ObjectIndex { list: K8sObject[]; byUid: Map<string, K8sObject>; byKind: Map<string, K8sObject[]>; }
export type EdgeType = "owns" | "selects" | "routes" | "mounts" | "class" | "uses";
export interface Edge { id: string; source: string; target: string; type: EdgeType; label: string; }
export interface Node {
  id: string; kind: string; name: string; ns: string; group: string;
  icon: string; accent: string; tier: number; count?: number;
  summary: string; nodeName?: string; manifest?: string; source?: { file: string; line?: number };
}
export interface GraphModel { nodes: Node[]; edges: Edge[]; groups: { id: string; label: string }[]; warnings: string[]; }
export type Linker = (objects: K8sObject[], index: ObjectIndex) => Edge[];
