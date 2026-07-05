import type { GraphModel, Node } from "@duru/core";
import { badge, HEALTH } from "./kinds";
import { detailsUrl } from "./links";

const OUT: Record<string, string> = { selects: "selects →", routes: "routes →", mounts: "mounts →", class: "class →", uses: "uses →" };
const IN: Record<string, string> = { selects: "← selected by", routes: "← routed by", mounts: "← mounted by", class: "← class of", uses: "← used by" };

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
  const url = detailsUrl(n);
  return (
    <div className="duru-inspector">
      <div className="duru-insp-head">
        <div className="duru-badge" style={{ background: b.color }}>{b.abbr}</div>
        <div className="duru-insp-title"><div className="duru-nm">{n.name}</div><div className="duru-sub">{n.kind}{n.ns ? " · " + n.ns : ""}</div></div>
        <button className="duru-x" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="duru-insp-body">
        <div className="duru-insp-sec"><span className="duru-dot" style={{ background: HEALTH[(n.health ?? "unknown") as keyof typeof HEALTH] }} /> {n.summary}</div>
        {typeof n.count === "number" ? (
          <div className="duru-insp-sec"><div className="duru-eyebrow">scale</div>×{n.count} desired replicas</div>
        ) : null}
        {[...grouped.entries()].map(([label, list]) => (
          <div className="duru-insp-sec" key={label}>
            <div className="duru-eyebrow">{label}</div>
            <div className="duru-chips">{list.map((t, i) => (
              <button className="duru-relchip" key={i} onClick={() => onSelect(t)}>{byId.get(t)?.name ?? t}</button>
            ))}</div>
          </div>
        ))}
        {url ? (
          <div className="duru-insp-sec"><a className="duru-open" href={url}>open in Headlamp →</a></div>
        ) : null}
      </div>
    </div>
  );
}
