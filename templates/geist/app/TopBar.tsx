import { useEffect, useMemo, useRef, useState } from "react";

type Item = { id: string; name: string; kind: string; ns: string };

export function TopBar({ items, crumbs, onCrumb, onAll, onPick, hint, warnings, manifestMode }: {
  items: Item[]; crumbs: { id: string; name: string }[];
  onCrumb: (id: string) => void; onAll: () => void; onPick: (id: string) => void; hint: string;
  warnings: string[]; manifestMode: boolean;
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
    <header className="kv-bar">
      <div className="kv-mark"><span className="kv-d" />kubeviz</div>
      {manifestMode ? <span className="kv-tag">manifest view · live state unknown</span> : null}
      {warnings.length ? (
        <span className="kv-warnwrap">
          <button className="kv-warnchip" onClick={() => setShowWarn((v) => !v)}>⚠ {warnings.length}</button>
          {showWarn ? <div className="kv-pop">{warnings.map((w, i) => <div key={i} className="kv-pop-row">{w}</div>)}</div> : null}
        </span>
      ) : null}
      <div className="kv-searchwrap">
        <input ref={inputRef} className="kv-search" placeholder="search  /" value={q} aria-label="Search resources"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches[active]) pick(matches[active].id);
            else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            else if (e.key === "Escape") { setQ(""); (e.target as HTMLInputElement).blur(); }
          }} />
        {matches.length ? (
          <div className="kv-drop">
            {matches.map((m, i) => (
              <button key={m.id} className={"kv-drop-row" + (i === active ? " on" : "")}
                onMouseEnter={() => setActive(i)} onClick={() => pick(m.id)}>
                <span className="kv-drop-kind">{m.kind}</span> {m.name}{m.ns ? <span className="kv-drop-ns"> · {m.ns}</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {crumbs.length ? (
        <div className="kv-crumbs">
          <button className="kv-crumb" onClick={onAll}>all</button>
          {crumbs.map((c) => (
            <span key={c.id} className="kv-crumbseg"><span className="kv-slash">/</span>
              <button className="kv-crumb" onClick={() => onCrumb(c.id)}>{c.name}</button></span>
          ))}
        </div>
      ) : <span className="kv-hint">{hint}</span>}
    </header>
  );
}
