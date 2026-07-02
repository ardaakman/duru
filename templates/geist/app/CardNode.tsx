import { Handle, Position } from "reactflow";
import { badge, HEALTH } from "./kinds.js";

export function CardNode({ data }: { data: any }) {
  const b = badge(data.kind);
  return (
    <div className={"kv-card" + (data.selected ? " sel" : "")}>
      <Handle type="target" position={Position.Left} className="kv-hd" />
      <div className="kv-badge" style={{ background: b.color }}>{b.abbr}</div>
      <div className="kv-txt">
        <div className="kv-nm">{data.name}</div>
        {data.sub ? <div className="kv-sub">{data.sub}</div> : null}
      </div>
      {data.childCount > 0
        ? <button className="kv-chip" onClick={(e) => { e.stopPropagation(); data.onToggle(); }}>{data.collapsed ? "▸" : "▾"} {data.childCount}</button>
        : <span className="kv-dot" style={{ background: HEALTH[(data.health as keyof typeof HEALTH) ?? "unknown"] ?? HEALTH.unknown }} />}
      <Handle type="source" position={Position.Right} className="kv-hd" />
    </div>
  );
}
