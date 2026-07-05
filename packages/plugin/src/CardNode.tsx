import { Handle, Position } from "reactflow";
import { badge, HEALTH } from "./kinds";

export function CardNode({ data }: { data: any }) {
  const b = badge(data.kind);
  // §1.3: own health when expanded; subtree-worst when collapsed (surface what you hide).
  const shown = data.childCount > 0 && data.collapsed ? data.rollupWorst : data.health;
  const color = HEALTH[(shown as keyof typeof HEALTH) ?? "unknown"] ?? HEALTH.unknown;
  const ring = shown === "ok" && data.collapsed && data.rollupUnobserved; // green, partially unobserved
  return (
    <div className={"duru-card" + (data.selected ? " sel" : "") + (data.dimmed ? " duru-dimmed" : "")}>
      <Handle type="target" position={Position.Left} className="duru-hd" />
      <div className="duru-badge" style={{ background: b.color }}>{b.abbr}</div>
      <div className="duru-txt">
        <div className="duru-nm">{data.name}</div>
        {data.sub ? <div className="duru-sub">{data.sub}</div> : null}
      </div>
      {data.childCount > 0
        ? <button className="duru-chip" onClick={(e) => { e.stopPropagation(); data.onToggle(); }}>{data.collapsed ? "▸" : "▾"} {data.childCount}</button>
        : null}
      <span className={"duru-dot" + (ring ? " duru-ring" : "")} style={{ background: color }} />
      <Handle type="source" position={Position.Right} className="duru-hd" />
    </div>
  );
}
