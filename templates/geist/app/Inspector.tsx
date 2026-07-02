import type { GraphModel, Node } from "../../../src/core/types.js";
import { badge, HEALTH } from "./kinds.js";

const REL_LABEL: Record<string, string> = { selects: "selects →", routes: "routes →", mounts: "mounts →", class: "class →", uses: "uses →" };

export function Inspector({ model, byId, id, onClose, onSelect }:
  { model: GraphModel; byId: Map<string, Node>; id: string; onClose: () => void; onSelect: (id: string) => void }) {
  const n = byId.get(id);
  if (!n) return null;
  const b = badge(n.kind);
  const grouped = new Map<string, string[]>();
  for (const e of model.edges) {
    if (e.type === "owns") continue;
    if (e.source !== id && e.target !== id) continue;
    const other = e.source === id ? e.target : e.source;
    const arr = grouped.get(e.type) ?? []; arr.push(other); grouped.set(e.type, arr);
  }
  return (
    <div className="kv-inspector">
      <div className="kv-insp-head">
        <div className="kv-badge" style={{ background: b.color }}>{b.abbr}</div>
        <div className="kv-insp-title"><div className="kv-nm">{n.name}</div><div className="kv-sub">{n.kind}{n.ns ? " · " + n.ns : ""}</div></div>
        <button className="kv-x" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="kv-insp-body">
        <div className="kv-insp-sec"><span className="kv-dot" style={{ background: HEALTH[(n.health ?? "unknown") as keyof typeof HEALTH] }} /> {n.summary}</div>
        {typeof n.count === "number" ? (
          <div className="kv-insp-sec"><div className="kv-eyebrow">scale</div>×{n.count} desired replicas</div>
        ) : null}
        {[...grouped.entries()].map(([type, list]) => (
          <div className="kv-insp-sec" key={type}>
            <div className="kv-eyebrow">{REL_LABEL[type] ?? type}</div>
            <div className="kv-chips">{list.map((t, i) => (
              <button className="kv-relchip" key={i} onClick={() => onSelect(t)}>{byId.get(t)?.name ?? t}</button>
            ))}</div>
          </div>
        ))}
        {n.source ? (
          <div className="kv-insp-sec"><div className="kv-eyebrow">source</div>
            <code className="kv-src">{n.source.file}{n.source.line ? ":" + n.source.line : ""}</code></div>
        ) : null}
        {n.manifest ? (
          <details className="kv-insp-sec"><summary className="kv-eyebrow">manifest</summary>
            <pre className="kv-yaml">{n.manifest}</pre></details>
        ) : null}
      </div>
    </div>
  );
}
