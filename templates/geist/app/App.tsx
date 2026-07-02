import { useEffect, useMemo, useState } from "react";
import ReactFlow, { Background, Controls, Panel, MarkerType, useReactFlow } from "reactflow";
import type { GraphModel } from "../../../src/core/types.js";
import { buildForest, visibleIds, layout, childCount, pathTo, rollupHealth } from "./tree.js";
import { familyOf } from "./kinds.js";
import { traceEdges, TRACE_COLORS } from "./trace.js";
import { CardNode } from "./CardNode.js";
import { Legend } from "./Legend.js";
import { Inspector } from "./Inspector.js";
import { TopBar } from "./TopBar.js";

const nodeTypes = { card: CardNode };
const EDGE_STYLE = { stroke: "#cfcfcf", strokeWidth: 1.4 };
const MARKER = { type: MarkerType.ArrowClosed, color: "#cfcfcf", width: 16, height: 16 };

function FitOnChange({ rootSignal, focus }: { rootSignal: string; focus: { id: string | null; n: number } }) {
  const rf = useReactFlow();
  useEffect(() => {
    const t = setTimeout(() => rf.fitView({ duration: 380, padding: 0.2 }), 60);
    return () => clearTimeout(t);
  }, [rootSignal, rf]);
  useEffect(() => {
    if (!focus.id) return;
    const t = setTimeout(() => rf.fitView({ nodes: [{ id: focus.id! }], duration: 380, maxZoom: 1 }), 80);
    return () => clearTimeout(t);
  }, [focus.n, rf]); // keyed on the counter so re-revealing the same node re-centers
  return null;
}

export function App({ model }: { model: GraphModel }) {
  const forest = useMemo(() => buildForest(model), [model]);
  const rollup = useMemo(() => rollupHealth(forest), [forest]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const c = new Set<string>();
    for (const [id, kids] of forest.childrenOf) {
      const n = forest.byId.get(id);
      if (n && ["ReplicaSet", "DaemonSet", "StatefulSet"].includes(n.kind) && kids.length > 3) c.add(id);
    }
    if (model.nodes.length > 150) for (const r of forest.roots) c.add(r);
    return c;
  });
  const [root, setRoot] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ id: string | null; n: number }>({ id: null, n: 0 });
  const [dimmed, setDimmed] = useState<Set<string>>(new Set());
  const toggleFamily = (f: string) => setDimmed((s) => { const n = new Set(s); n.has(f) ? n.delete(f) : n.add(f); return n; });
  const toggle = (id: string) => setCollapsed((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const drill = (id: string) => { if (childCount(forest, id) > 0) { setCollapsed((s) => { const x = new Set(s); x.delete(id); return x; }); setRoot(id); } };
  // §2.1 contract: expand ancestors → retain drill root iff target inside → select → center.
  const reveal = (id: string) => {
    const chain = pathTo(forest, id);
    setCollapsed((s) => { const n = new Set(s); for (const a of chain) n.delete(a); return n; });
    setRoot((r) => (r && chain.includes(r) ? r : null));
    setSelected(id);
    setFocus((f) => ({ id, n: f.n + 1 }));
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Layout memo: geometry only — selection must NOT re-run dagre (§2.2).
  const base = useMemo(() => {
    const ids = visibleIds(forest, collapsed, root);
    const pos = layout(forest, ids);
    const rfn = ids.map((id) => {
      const n = forest.byId.get(id)!;
      return {
        id, type: "card", position: pos.get(id)!,
        data: { kind: n.kind, name: n.name, sub: n.nodeName, health: n.health,
          rollupWorst: rollup.get(id)?.worst, rollupUnobserved: rollup.get(id)?.hasUnobserved ?? false, dimmed: false,
          childCount: childCount(forest, id), collapsed: collapsed.has(id), selected: false, onToggle: () => toggle(id) },
      };
    });
    const vis = new Set(ids);
    const rfe = forest.ownEdges.filter((e) => vis.has(e.source) && vis.has(e.target))
      .map((e) => ({ id: e.id, source: e.source, target: e.target, type: "smoothstep", style: EDGE_STYLE, markerEnd: MARKER }));
    return { rfn, rfe };
  }, [forest, rollup, collapsed, root]);
  const nodes = useMemo(
    () => base.rfn.map((n) => {
      const dim = dimmed.has(familyOf(n.data.kind));
      const sel = n.id === selected;
      return dim || sel ? { ...n, data: { ...n.data, selected: sel, dimmed: dim } } : n;
    }),
    [base, selected, dimmed]);
  const trace = useMemo(() => {
    const vis = new Set(base.rfn.map((n) => n.id));
    return traceEdges(model, selected, vis);
  }, [base, model, selected]);
  const edges = useMemo(() => [
    ...base.rfe,
    ...trace.edges.map((e) => ({
      id: "trace:" + e.id, source: e.source, target: e.target, type: "smoothstep", animated: true, label: e.type,
      labelStyle: { font: "10px ui-monospace, monospace", fill: "#4d4d4d" }, labelBgStyle: { fill: "#fafafa" },
      style: { stroke: TRACE_COLORS[e.type] ?? "#8f8f8f", strokeWidth: 1.6, strokeDasharray: "5 4" },
      markerEnd: { type: MarkerType.ArrowClosed, color: TRACE_COLORS[e.type] ?? "#8f8f8f", width: 14, height: 14 },
    })),
  ], [base, trace]);

  const crumbs = (root ? pathTo(forest, root) : []).map((c) => ({ id: c, name: forest.byId.get(c)?.name ?? c }));
  const items = useMemo(
    () => [...forest.byId.values()].map((n) => ({ id: n.id, name: n.name, kind: n.kind, ns: n.ns })),
    [forest]);
  const manifestMode = useMemo(() => model.nodes.every((n) => !n.health || n.health === "unknown"), [model]);

  return (
    <div className="kv-app">
      <TopBar items={items} crumbs={crumbs} onAll={() => setRoot(null)}
        onCrumb={(id) => setRoot(id)} onPick={reveal}
        hint="double-click a node to drill in · click ▸ to collapse · / to search"
        warnings={model.warnings} manifestMode={manifestMode} />
      <div className="kv-stage">
        <ReactFlow
          nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.2} onlyRenderVisibleElements
          onNodeClick={(_, n) => setSelected(n.id)}
          onNodeDoubleClick={(_, n) => drill(n.id)}
          onPaneClick={() => setSelected(null)}
        >
          <Background color="#e6e6e6" gap={22} />
          <Controls showInteractive={false} />
          <Panel position="bottom-right"><Legend activeTraceTypes={trace.types} dimmed={dimmed} onToggleFamily={toggleFamily} /></Panel>
          <FitOnChange rootSignal={root ?? "__all__"} focus={focus} />
        </ReactFlow>
        {selected ? <Inspector model={model} byId={forest.byId} id={selected} onClose={() => setSelected(null)} onSelect={reveal} /> : null}
      </div>
    </div>
  );
}
