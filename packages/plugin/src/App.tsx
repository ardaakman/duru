import type { GraphModel } from "@duru/core";
import { buildForest, childCount, layout, pathTo, rollupHealth, TRACE_COLORS,traceEdges, visibleIds } from "@duru/core";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, { Background, Controls, MarkerType, Panel, useReactFlow } from "reactflow";
import { CardNode } from "./CardNode";
import { Inspector } from "./Inspector";
import { familyOf } from "./kinds";
import { Legend } from "./Legend";
import { bgDots, edgeStroke } from "./theme";
import { TopBar } from "./TopBar";

const nodeTypes = { card: CardNode };

function FitOnChange({ rootSignal, focus }: { rootSignal: string; focus: { id: string | null; n: number } }) {
  const rf = useReactFlow();
  useEffect(() => {
    const t = setTimeout(() => rf.fitView({ duration: 380, padding: 0.2 }), 60);
    return () => clearTimeout(t);
  }, [rootSignal, rf]);
  useEffect(() => {
    if (!focus.id) return;
    const t = setTimeout(() => rf.fitView({ nodes: [{ id: focus.id! }] as any, duration: 380, maxZoom: 1 }), 80);
    return () => clearTimeout(t);
  }, [focus.n, rf]);
  return null;
}

export function App({ model, pending, onRefresh, structureRev, warnings, dark }: {
  model: GraphModel; pending: number; onRefresh: () => void; structureRev: number; warnings: string[]; dark: boolean;
}) {
  const edgeStyle = { stroke: edgeStroke(dark), strokeWidth: 1.4 };
  const marker = { type: MarkerType.ArrowClosed, color: edgeStroke(dark), width: 16, height: 16 };
  const forest = useMemo(() => buildForest(model), [model]);
  const rollup = useMemo(() => rollupHealth(forest), [forest]);   // recomputes on health patches — cheap, no layout
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
  const toggle = (id: string) => setCollapsed((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleFamily = (f: string) => setDimmed((s) => { const n = new Set(s); n.has(f) ? n.delete(f) : n.add(f); return n; });
  const drill = (id: string) => { if (childCount(forest, id) > 0) { setCollapsed((s) => { const x = new Set(s); x.delete(id); return x; }); setRoot(id); } };
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

  const ids = useMemo(() => visibleIds(forest, collapsed, root), [forest, collapsed, root]);
  // POSITION CACHE (spec: dagre must not run on health-only updates). Key = visible
  // structure (ids + parents); health patches rebuild `forest` but leave the key equal.
  const posKey = useMemo(() => ids.map((i) => i + ":" + (forest.byId.get(i)?.parentId ?? "")).join("|"), [ids, forest]);
  const posRef = useRef<{ key: string; pos: Map<string, { x: number; y: number }> } | null>(null);
  if (!posRef.current || posRef.current.key !== posKey) posRef.current = { key: posKey, pos: layout(forest, ids) };
  const positions = posRef.current.pos;

  const base = useMemo(() => {
    const rfn = ids.map((id) => {
      const n = forest.byId.get(id)!;
      return {
        id, type: "card", position: positions.get(id)!,
        data: { kind: n.kind, name: n.name, sub: n.nodeName, health: n.health,
          rollupWorst: rollup.get(id)?.worst, rollupUnobserved: rollup.get(id)?.hasUnobserved ?? false, dimmed: false,
          childCount: childCount(forest, id), collapsed: collapsed.has(id), selected: false, onToggle: () => toggle(id) },
      };
    });
    const vis = new Set(ids);
    const rfe = forest.ownEdges.filter((e) => vis.has(e.source) && vis.has(e.target))
      .map((e) => ({ id: e.id, source: e.source, target: e.target, type: "smoothstep", style: edgeStyle, markerEnd: marker }));
    return { rfn, rfe };
  }, [forest, rollup, ids, positions, collapsed, dark]);
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

  return (
    <div className={"duru-app" + (dark ? " duru-dark" : "")}>
      <TopBar items={items} crumbs={crumbs} onAll={() => setRoot(null)}
        onCrumb={(id) => setRoot(id)} onPick={reveal}
        hint="double-click a node to drill in · click ▸ to collapse · / to search"
        warnings={warnings} pending={pending} onRefresh={onRefresh} />
      <div className="duru-stage">
        <ReactFlow
          nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.2} onlyRenderVisibleElements
          onNodeClick={(_, n) => setSelected(n.id)}
          onNodeDoubleClick={(_, n) => drill(n.id)}
          onPaneClick={() => setSelected(null)}
        >
          <Background color={bgDots(dark)} gap={22} />
          <Controls showInteractive={false} />
          <Panel position="bottom-right"><Legend activeTraceTypes={trace.types} dimmed={dimmed} onToggleFamily={toggleFamily} /></Panel>
          <FitOnChange rootSignal={(root ?? "__all__") + ":" + structureRev} focus={focus} />
        </ReactFlow>
        {selected ? <Inspector model={model} byId={forest.byId} id={selected} onClose={() => setSelected(null)} onSelect={reveal} /> : null}
      </div>
    </div>
  );
}
