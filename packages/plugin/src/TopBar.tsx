import type { Filters, Node } from "@duru/core";
import { emptyFilters, filtersActive, matchNodes } from "@duru/core";
import { useEffect, useMemo, useRef, useState } from "react";

export function TopBar({ searchNodes, crumbs, onCrumb, onAll, onPick, hint, warnings, pending, onRefresh,
  focusName, truncated, onExitFocus, filters, onFilters, filterMeta, filtersSuspended, crs, onCrs, crLoading, onCollapseAll }: {
  searchNodes: Node[]; crumbs: { id: string; name: string }[];
  onCrumb: (id: string) => void; onAll: () => void; onPick: (id: string) => void; hint: string;
  warnings: string[]; pending: number; onRefresh: () => void;
  focusName?: string | null; truncated?: boolean; onExitFocus?: () => void;
  filters: Filters; onFilters: (f: Filters) => void;
  filterMeta: { namespaces: [string, number][]; kinds: [string, number][] };
  filtersSuspended: boolean; crs: boolean; onCrs: (v: boolean) => void; crLoading: boolean;
  onCollapseAll: () => void;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [showWarn, setShowWarn] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => matchNodes(searchNodes, q), [q, searchNodes]);
  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  // Esc closes an open filter popover FIRST (capture phase beats App's bubble-phase focus→inspector handler).
  useEffect(() => {
    if (!showFilter) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setShowFilter(false); } };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [showFilter]);
  const pick = (id: string) => { setQ(""); onPick(id); };
  const toggleSet = (set: Set<string>, v: string) => { const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); return n; };
  const chips: { label: string; onX: () => void }[] = [
    ...[...filters.namespaces].map((ns) => ({ label: `ns: ${ns}`, onX: () => onFilters({ ...filters, namespaces: toggleSet(filters.namespaces, ns) }) })),
    ...[...filters.kinds].map((k) => ({ label: `kind: ${k}`, onX: () => onFilters({ ...filters, kinds: toggleSet(filters.kinds, k) }) })),
    ...(filters.problemsOnly ? [{ label: "⚠ problems only", onX: () => onFilters({ ...filters, problemsOnly: false }) }] : []),
  ];
  return (
    <header className="duru-bars">
      <div className="duru-bar">
        <div className="duru-mark"><span className="duru-d" />duru</div>
        {pending > 0 ? (
          <button className="duru-pill" onClick={onRefresh} title="Cluster topology changed — click to re-layout">↻ {pending} changes</button>
        ) : null}
        {warnings.length ? (
          <span className="duru-warnwrap">
            <button className="duru-warnchip" onClick={() => setShowWarn((v) => !v)}>⚠ {warnings.length}</button>
            {showWarn ? <div className="duru-pop">{warnings.map((w, i) => <div key={i} className="duru-pop-row">{w}</div>)}</div> : null}
          </span>
        ) : null}
        <div className="duru-searchwrap">
          <input ref={inputRef} className="duru-search" placeholder="search  /" value={q} aria-label="Search resources"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches[active]) pick(matches[active].node.id);
              else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === "Escape") { setQ(""); (e.target as HTMLInputElement).blur(); }
            }} />
          {matches.length ? (
            <div className="duru-drop">
              {matches.map((m, i) => (
                <button key={m.node.id} className={"duru-drop-row" + (i === active ? " on" : "")}
                  onMouseEnter={() => setActive(i)} onClick={() => pick(m.node.id)}>
                  <span className="duru-drop-kind">{m.node.kind}</span> {m.node.name}
                  {m.node.ns ? <span className="duru-drop-ns"> · {m.node.ns}</span> : null}
                  {m.why ? <span className="duru-drop-why">{m.why}</span> : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <span className="duru-filterwrap">
          <button className={"duru-toolbtn" + (filtersActive(filters) ? " on" : "")} onClick={() => setShowFilter((v) => !v)}>⛭ Filter</button>
          {showFilter ? (
            <div className="duru-pop duru-filterpop">
              <div className="duru-eyebrow">namespaces</div>
              {filterMeta.namespaces.map(([ns, c]) => (
                <label key={ns} className="duru-check"><input type="checkbox" checked={filters.namespaces.has(ns)}
                  onChange={() => onFilters({ ...filters, namespaces: toggleSet(filters.namespaces, ns) })} /> {ns} <span className="duru-count">{c}</span></label>
              ))}
              <div className="duru-eyebrow" style={{ marginTop: 8 }}>kinds</div>
              {filterMeta.kinds.map(([k, c]) => (
                <label key={k} className="duru-check"><input type="checkbox" checked={filters.kinds.has(k)}
                  onChange={() => onFilters({ ...filters, kinds: toggleSet(filters.kinds, k) })} /> {k} <span className="duru-count">{c}</span></label>
              ))}
              <label className="duru-check" style={{ marginTop: 8 }} title="custom resources carry no health — problems only hides them">
                <input type="checkbox" checked={filters.problemsOnly}
                  onChange={() => onFilters({ ...filters, problemsOnly: !filters.problemsOnly })} /> ⚠ problems only</label>
            </div>
          ) : null}
        </span>
        <button className={"duru-toolbtn" + (crs ? " on" : "")} onClick={() => onCrs(!crs)}
          title="Include the cluster's custom resources (fetched every 30s)">
          {crLoading ? "CRs…" : "CRs"}
        </button>
        <button className="duru-toolbtn" onClick={onCollapseAll}
          title="Fold everything back to the top-level overview">⊟ collapse all</button>
        {focusName ? (
          <div className="duru-crumbs">
            <button className="duru-crumb" onClick={onExitFocus}>all</button>
            <span className="duru-slash">/</span>
            <span className="duru-crumb" style={{ cursor: "default" }}>⌖ {focusName}</span>
            {truncated ? <span className="duru-focuschip" title="Neighborhood capped — see +N more cards">⚠ truncated</span> : null}
          </div>
        ) : crumbs.length ? (
          <div className="duru-crumbs">
            <button className="duru-crumb" onClick={onAll}>all</button>
            {crumbs.map((c) => (
              <span key={c.id} className="duru-crumbseg"><span className="duru-slash">/</span>
                <button className="duru-crumb" onClick={() => onCrumb(c.id)}>{c.name}</button></span>
            ))}
          </div>
        ) : <span className="duru-hint">{hint}</span>}
      </div>
      {chips.length ? (
        <div className="duru-chipbar" title={filtersSuspended ? "filters are suspended while focused" : undefined}>
          {chips.map((c) => (
            <span key={c.label} className={"duru-fchip" + (filtersSuspended ? " off" : "")}>{c.label}
              <button className="duru-fchip-x" onClick={c.onX} aria-label={`remove ${c.label}`}>×</button></span>
          ))}
          {chips.length >= 2 ? <button className="duru-clearall" onClick={() => onFilters(emptyFilters())}>clear all</button> : null}
        </div>
      ) : null}
    </header>
  );
}
