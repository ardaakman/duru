import { useEffect, useMemo, useState } from "react";
import ReactFlow, { Background, Controls, Panel, MarkerType, useReactFlow } from "reactflow";
import type { GraphModel } from "../../../src/core/types.js";
import { buildForest, visibleIds, layout, childCount, pathTo } from "./tree.js";
import { CardNode } from "./CardNode.js";
import { Legend } from "./Legend.js";
import { Inspector } from "./Inspector.js";

const nodeTypes = { card: CardNode };
const EDGE_STYLE = { stroke: "#cfcfcf", strokeWidth: 1.4 };
const MARKER = { type: MarkerType.ArrowClosed, color: "#cfcfcf", width: 16, height: 16 };

function FitOnChange({ signal }: { signal: string }) {
  const rf = useReactFlow();
  useEffect(() => {
    const t = setTimeout(() => rf.fitView({ duration: 380, padding: 0.2 }), 60);
    return () => clearTimeout(t);
  }, [signal, rf]);
  return null;
}

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
  const [root, setRoot] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const toggle = (id: string) => setCollapsed((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const drill = (id: string) => { if (childCount(forest, id) > 0) { setCollapsed((s) => { const x = new Set(s); x.delete(id); return x; }); setRoot(id); } };
  // Reveal a (possibly hidden/off-screen) node: exit any drill, expand its whole
  // ancestor chain, then select it — used by inspector relationship chips (spec §6).
  const reveal = (id: string) => {
    setCollapsed((s) => { const n = new Set(s); for (const a of pathTo(forest, id)) n.delete(a); return n; });
    setRoot(null);
    setSelected(id);
  };

  const { nodes, edges } = useMemo(() => {
    const ids = visibleIds(forest, collapsed, root);
    const pos = layout(forest, ids);
    const rfn = ids.map((id) => {
      const n = forest.byId.get(id)!;
      return {
        id, type: "card", position: pos.get(id)!,
        data: { kind: n.kind, name: n.name, sub: n.nodeName, health: n.health, childCount: childCount(forest, id), collapsed: collapsed.has(id), selected: selected === id, onToggle: () => toggle(id) },
      };
    });
    const vis = new Set(ids);
    const rfe = forest.ownEdges.filter((e) => vis.has(e.source) && vis.has(e.target))
      .map((e) => ({ id: e.id, source: e.source, target: e.target, type: "smoothstep", style: EDGE_STYLE, markerEnd: MARKER }));
    return { nodes: rfn, edges: rfe };
  }, [forest, collapsed, root, selected]);

  const crumbs = root ? pathTo(forest, root) : [];

  return (
    <div className="kv-app">
      <header className="kv-bar">
        <div className="kv-mark"><span className="kv-d" />kubeviz</div>
        {root ? (
          <div className="kv-crumbs">
            <button className="kv-crumb" onClick={() => setRoot(null)}>all</button>
            {crumbs.map((c, i) => (
              <span key={c} className="kv-crumbs">
                <span className="kv-slash">/</span>
                <button className="kv-crumb" onClick={() => setRoot(i === crumbs.length - 1 ? root : c)}>{forest.byId.get(c)?.name}</button>
              </span>
            ))}
          </div>
        ) : <span className="kv-hint">double-click a node to drill in · click ▸ to collapse</span>}
      </header>
      <div className="kv-stage">
        <ReactFlow
          nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.2}
          onNodeClick={(_, n) => setSelected(n.id)}
          onNodeDoubleClick={(_, n) => drill(n.id)}
          onPaneClick={() => setSelected(null)}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#e6e6e6" gap={22} />
          <Controls showInteractive={false} />
          <Panel position="top-right"><Legend /></Panel>
          <FitOnChange signal={root ?? "__all__"} />
        </ReactFlow>
        {selected ? <Inspector model={model} byId={forest.byId} id={selected} onClose={() => setSelected(null)} onSelect={reveal} /> : null}
      </div>
    </div>
  );
}
