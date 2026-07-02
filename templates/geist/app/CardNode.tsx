import { Handle, Position } from "reactflow";
import { badge, HEALTH } from "./kinds.js";

export function CardNode({ data }: { data: any }) {
  const b = badge(data.kind);
  // §1.3: own health when expanded; subtree-worst when collapsed (surface what you hide).
  const shown = data.childCount > 0 && data.collapsed ? data.rollupWorst : data.health;
  const color = HEALTH[(shown as keyof typeof HEALTH) ?? "unknown"] ?? HEALTH.unknown;
  const ring = shown === "ok" && data.collapsed && data.rollupUnobserved; // green, partially unobserved
  return (
    <div className={"kv-card" + (data.selected ? " sel" : "") + (data.dimmed ? " kv-dimmed" : "")}>
      <Handle type="target" position={Position.Left} className="kv-hd" />
      <div className="kv-badge" style={{ background: b.color }}>{b.abbr}</div>
      <div className="kv-txt">
        <div className="kv-nm">{data.name}</div>
        {data.sub ? <div className="kv-sub">{data.sub}</div> : null}
      </div>
      {data.childCount > 0
        ? <button className="kv-chip" onClick={(e) => { e.stopPropagation(); data.onToggle(); }}>{data.collapsed ? "▸" : "▾"} {data.childCount}</button>
        : null}
      <span className={"kv-dot" + (ring ? " kv-ring" : "")} style={{ background: color }} />
      <Handle type="source" position={Position.Right} className="kv-hd" />
    </div>
  );
}
