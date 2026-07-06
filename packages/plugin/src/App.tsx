import type { GraphModel } from "@duru/core";
import { buildForest, childCount, focusSet, layout, pathTo, rollupHealth, TRACE_COLORS, traceEdges, visibleIds } from "@duru/core";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, { Background, Controls, MarkerType, Panel, useReactFlow } from "reactflow";
import { CardNode } from "./CardNode";
import { Inspector } from "./Inspector";
import { familyOf } from "./kinds";
import { Legend } from "./Legend";
import { bgDots, edgeStroke } from "./theme";
import { TopBar } from "./TopBar";

const nodeTypes = { card: CardNode };

function FitOnChange({ rootSignal, focusSignal }: { rootSignal: string; focusSignal: { id: string | null; n: number } }) {
  const rf = useReactFlow();
  useEffect(() => {
    const t = setTimeout(() => rf.fitView({ duration: 380, padding: 0.2 }), 60);
    return () => clearTimeout(t);
  }, [rootSignal, rf]);
  useEffect(() => {
    if (!focusSignal.id) return;
    const t = setTimeout(() => rf.fitView({ nodes: [{ id: focusSignal.id! }] as any, duration: 380, maxZoom: 1 }), 80);
    return () => clearTimeout(t);
  }, [focusSignal.n, rf]);
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
  const [focusSignal, setFocusSignal] = useState<{ id: string | null; n: number }>({ id: null, n: 0 });
  const [dimmed, setDimmed] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setCollapsed((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleFamily = (f: string) => setDimmed((s) => { const n = new Set(s); n.has(f) ? n.delete(f) : n.add(f); return n; });
  const drill = (id: string) => { setFocus(null); if (childCount(forest, id) > 0) { setCollapsed((s) => { const x = new Set(s); x.delete(id); return x; }); setRoot(id); } };
  const [focus, setFocus] = useState<string | null>(null);
  const focusRef = useRef<string | null>(null); focusRef.current = focus;
  const enterFocus = (id: string) => { setRoot(null); setFocus(id); setSelected(id); setFocusSignal((f) => ({ id, n: f.n + 1 })); };
  const exitFocus = () => setFocus(null);
  const reveal = (id: string) => {
    setFocus(null);
    const chain = pathTo(forest, id);
    setCollapsed((s) => { const n = new Set(s); for (const a of chain) n.delete(a); return n; });
    setRoot((r) => (r && chain.includes(r) ? r : null));
    setSelected(id);
    setFocusSignal((f) => ({ id, n: f.n + 1 }));
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key !== "Escape") return; if (focusRef.current) setFocus(null); else setSelected(null); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const [localWarn, setLocalWarn] = useState<string | null>(null);
  const focusRes = useMemo(
    () => (focus && forest.byId.has(focus) ? focusSet(model, forest, focus) : null),
    [model, forest, focus]);
  useEffect(() => {
    if (focus && !forest.byId.has(focus)) { setFocus(null); setLocalWarn("focused node no longer exists"); }
  }, [focus, forest]);

  const ids = useMemo(
    () => (focusRes ? focusRes.ids : visibleIds(forest, collapsed, root)),
    [focusRes, forest, collapsed, root]);
  const idsSet = useMemo(() => new Set(ids), [ids]);
  // POSITION CACHE (spec: dagre must not run on health-only updates). Key = visible
  // structure (ids + parents); health patches rebuild `forest` but leave the key equal.
  const posKey = useMemo(
    () => (focusRes ? "F:" + focus + ":" : "") + ids.map((i) => i + ":" + (forest.byId.get(i)?.parentId ?? "")).join("|"),
    [focusRes, focus, ids, forest]);
  const posRef = useRef<{ key: string; pos: Map<string, { x: number; y: number }> } | null>(null);
  if (!posRef.current || posRef.current.key !== posKey) {
    const pos = layout(forest, ids);
    if (focusRes) {
      const seenPerAnchor = new Map<string, number>();
      for (const m of focusRes.more) {
        const idx = seenPerAnchor.get(m.anchorId) ?? 0;
        seenPerAnchor.set(m.anchorId, idx + 1);
        const anchorPos = pos.get(m.anchorId);
        if (anchorPos) pos.set(m.id, { x: anchorPos.x + 300, y: anchorPos.y + 64 * idx });
      }
    }
    posRef.current = { key: posKey, pos };
  }
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
    if (focusRes) {
      for (const m of focusRes.more) {
        rfn.push({ id: m.id, type: "card", position: positions.get(m.id) ?? { x: 0, y: 0 }, data: { more: true, name: m.label, kind: "", childCount: 0 } } as any);
        rfe.push({ id: "moree:" + m.id, source: m.anchorId, target: m.id, type: "smoothstep", style: { stroke: edgeStroke(dark), strokeWidth: 1.2, strokeDasharray: "3 4" } } as any);
      }
      for (const e of model.edges) {
        if (e.type === "owns") continue;
        if (!idsSet.has(e.source) || !idsSet.has(e.target)) continue;
        rfe.push({
          id: "focus:" + e.id, source: e.source, target: e.target, type: "smoothstep", animated: true, label: e.type,
          labelStyle: { font: "10px ui-monospace, monospace", fill: dark ? "#b8b8b8" : "#4d4d4d" }, labelBgStyle: { fill: dark ? "#111113" : "#fafafa" },
          style: { stroke: TRACE_COLORS[e.type] ?? "#8f8f8f", strokeWidth: 1.6, strokeDasharray: "5 4" },
          markerEnd: { type: MarkerType.ArrowClosed, color: TRACE_COLORS[e.type] ?? "#8f8f8f", width: 14, height: 14 },
        } as any);
      }
    }
    return { rfn, rfe };
  }, [forest, rollup, ids, positions, collapsed, dark, focusRes, idsSet, model]);
  const nodes = useMemo(
    () => base.rfn.map((n) => {
      const dim = dimmed.has(familyOf(n.data.kind));
      const sel = n.id === selected;
      return dim || sel ? { ...n, data: { ...n.data, selected: sel, dimmed: dim } } : n;
    }),
    [base, selected, dimmed]);
  const trace = useMemo(() => {
    if (focusRes) {
      const types = [...new Set(model.edges
        .filter((e) => e.type !== "owns" && idsSet.has(e.source) && idsSet.has(e.target))
        .map((e) => e.type))];
      return { edges: [], types };
    }
    return traceEdges(model, selected, idsSet);
  }, [focusRes, model, selected, idsSet]);
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
        warnings={localWarn ? [...warnings, localWarn] : warnings} pending={pending} onRefresh={onRefresh}
        focusName={focus ? forest.byId.get(focus)?.name ?? null : null} truncated={focusRes?.truncated ?? false} onExitFocus={exitFocus} />
      <div className="duru-stage">
        <ReactFlow
          nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView minZoom={0.2} onlyRenderVisibleElements
          onNodeClick={(_, n) => { if (n.id.startsWith("more:")) return; setSelected(n.id); }}
          onNodeDoubleClick={(_, n) => { if (n.id.startsWith("more:")) return; childCount(forest, n.id) > 0 ? drill(n.id) : enterFocus(n.id); }}
          onPaneClick={() => setSelected(null)}
        >
          <Background color={bgDots(dark)} gap={22} />
          <Controls showInteractive={false} />
          <Panel position="bottom-right"><Legend activeTraceTypes={trace.types} dimmed={dimmed} onToggleFamily={toggleFamily} /></Panel>
          <FitOnChange rootSignal={(root ?? "__all__") + ":" + (focus ?? "-") + ":" + structureRev} focusSignal={focusSignal} />
        </ReactFlow>
        {selected ? <Inspector model={model} byId={forest.byId} id={selected} onClose={() => setSelected(null)} onSelect={reveal} onFocus={enterFocus} /> : null}
      </div>
    </div>
  );
}
