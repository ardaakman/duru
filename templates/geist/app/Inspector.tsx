import type { GraphModel, Node } from "../../../src/core/types.js";
import { badge, HEALTH } from "./kinds.js";

// Direction-aware labels (§6.3): outgoing reads "type →", incoming "← typed by".
const OUT: Record<string, string> = { selects: "selects →", routes: "routes →", mounts: "mounts →", class: "class →", uses: "uses →" };
const IN: Record<string, string> = { selects: "← selected by", routes: "← routed by", mounts: "← mounted by", class: "← class of", uses: "← used by" };

function copyText(text: string) {
  if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(text).catch(() => fallbackCopy(text)); return; }
  fallbackCopy(text);
}
function fallbackCopy(text: string) { // file:// contexts may lack the async clipboard API
  const ta = document.createElement("textarea");
  ta.value = text; document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); } finally { document.body.removeChild(ta); }
}

export function Inspector({ model, byId, id, onClose, onSelect }:
  { model: GraphModel; byId: Map<string, Node>; id: string; onClose: () => void; onSelect: (id: string) => void }) {
  const n = byId.get(id);
  if (!n) return null;
  const b = badge(n.kind);
  const grouped = new Map<string, string[]>();
  const add = (key: string, target: string) => { const a = grouped.get(key) ?? []; a.push(target); grouped.set(key, a); };
  for (const e of model.edges) {
    if (e.source !== id && e.target !== id) continue;
    const outgoing = e.source === id;
    const other = outgoing ? e.target : e.source;
    if (e.type === "owns") add(outgoing ? "owns →" : "owned by →", other);
    else add(outgoing ? OUT[e.type] ?? e.type : IN[e.type] ?? e.type, other);
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
        {[...grouped.entries()].map(([label, list]) => (
          <div className="kv-insp-sec" key={label}>
            <div className="kv-eyebrow">{label}</div>
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
          <details className="kv-insp-sec">
            <summary className="kv-eyebrow">manifest
              <button className="kv-copy" onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyText(n.manifest!); }}>copy</button>
            </summary>
            <pre className="kv-yaml">{n.manifest}</pre>
          </details>
        ) : null}
      </div>
    </div>
  );
}
