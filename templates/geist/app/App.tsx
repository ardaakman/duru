import { useMemo, useState } from "react";
import ReactFlow, { Background, Controls, Panel, MarkerType } from "reactflow";
import type { GraphModel } from "../../../src/core/types.js";
import { buildForest, visibleIds, layout, childCount } from "./tree.js";
import { CardNode } from "./CardNode.js";
import { Legend } from "./Legend.js";

const nodeTypes = { card: CardNode };
const EDGE_STYLE = { stroke: "#cfcfcf", strokeWidth: 1.4 };
const MARKER = { type: MarkerType.ArrowClosed, color: "#cfcfcf", width: 16, height: 16 };

export function App({ model }: { model: GraphModel }) {
  const forest = useMemo(() => buildForest(model), [model]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const c = new Set<string>();
    for (const [id, kids] of forest.childrenOf) {
      const n = forest.byId.get(id);
      if (n && ["ReplicaSet", "DaemonSet", "StatefulSet"].includes(n.kind) && kids.length > 3) c.add(id);
    }
    return c;
  });
  const toggle = (id: string) => setCollapsed((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const { nodes, edges } = useMemo(() => {
    const ids = visibleIds(forest, collapsed, null);
    const pos = layout(forest, ids);
    const rfn = ids.map((id) => {
      const n = forest.byId.get(id)!;
      return {
        id, type: "card", position: pos.get(id)!,
        data: { kind: n.kind, name: n.name, sub: n.nodeName, health: n.health, childCount: childCount(forest, id), collapsed: collapsed.has(id), selected: false, onToggle: () => toggle(id) },
      };
    });
    const vis = new Set(ids);
    const rfe = forest.ownEdges.filter((e) => vis.has(e.source) && vis.has(e.target))
      .map((e) => ({ id: e.id, source: e.source, target: e.target, type: "smoothstep", style: EDGE_STYLE, markerEnd: MARKER }));
    return { nodes: rfn, edges: rfe };
  }, [forest, collapsed]);

  return (
    <div className="kv-app">
      <header className="kv-bar">
        <div className="kv-mark"><span className="kv-d" />kubeviz</div>
        <span className="kv-hint">double-click a node to drill in · click ▸ to collapse</span>
      </header>
      <div className="kv-stage">
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.2} proOptions={{ hideAttribution: true }}>
          <Background color="#e6e6e6" gap={22} />
          <Controls showInteractive={false} />
          <Panel position="top-right"><Legend /></Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
