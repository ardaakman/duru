import { useEffect, useMemo, useRef, useState } from "react";

type Item = { id: string; name: string; kind: string; ns: string };

export function TopBar({ items, crumbs, onCrumb, onAll, onPick, hint, warnings, pending, onRefresh, focusName, truncated, onExitFocus }: {
  items: Item[]; crumbs: { id: string; name: string }[];
  onCrumb: (id: string) => void; onAll: () => void; onPick: (id: string) => void; hint: string;
  warnings: string[]; pending: number; onRefresh: () => void;
  focusName?: string | null; truncated?: boolean; onExitFocus?: () => void;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [showWarn, setShowWarn] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return items.filter((i) => i.name.toLowerCase().includes(s) || i.kind.toLowerCase().includes(s)).slice(0, 8);
  }, [q, items]);
  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  const pick = (id: string) => { setQ(""); onPick(id); };
  return (
    <header className="duru-bar">
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
            if (e.key === "Enter" && matches[active]) pick(matches[active].id);
            else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Escape") { setQ(""); (e.target as HTMLInputElement).blur(); }
          }} />
        {matches.length ? (
          <div className="duru-drop">
            {matches.map((m, i) => (
              <button key={m.id} className={"duru-drop-row" + (i === active ? " on" : "")}
                onMouseEnter={() => setActive(i)} onClick={() => pick(m.id)}>
                <span className="duru-drop-kind">{m.kind}</span> {m.name}{m.ns ? <span className="duru-drop-ns"> · {m.ns}</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
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
    </header>
  );
}
