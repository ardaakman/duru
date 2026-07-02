import { FAMILY, HEALTH } from "./kinds.js";
import { TRACE_COLORS } from "./trace.js";

const ROWS: [string, keyof typeof FAMILY, string][] = [
  ["controllers", "controllers", FAMILY.controllers], ["pods / replicas", "pods", FAMILY.pods],
  ["networking", "networking", FAMILY.networking], ["config", "config", FAMILY.config],
  ["storage", "storage", FAMILY.storage], ["secrets", "secrets", FAMILY.secrets], ["identity", "identity", FAMILY.identity],
];

export function Legend({ activeTraceTypes, dimmed, onToggleFamily }: {
  activeTraceTypes: string[]; dimmed: Set<string>; onToggleFamily: (f: string) => void;
}) {
  return (
    <div className="kv-legend">
      <div className="kv-legend-h">legend · click to dim</div>
      {ROWS.map(([label, fam, color]) => (
        <button key={fam} className={"kv-legend-row kv-legend-btn" + (dimmed.has(fam) ? " off" : "")} onClick={() => onToggleFamily(fam)}>
          <span className="kv-sw" style={{ background: color }} />{label}
        </button>
      ))}
      <div className="kv-legend-sep" />
      <div className="kv-legend-row"><span className="kv-dot" style={{ background: HEALTH.ok }} />healthy</div>
      <div className="kv-legend-row"><span className="kv-dot kv-ring" style={{ background: HEALTH.ok }} />healthy · partly unobserved</div>
      <div className="kv-legend-row"><span className="kv-mono">▸ 4</span>collapsed · click to expand</div>
      {activeTraceTypes.length ? (
        <div className="kv-legend-edges">
          <div className="kv-legend-sep" />
          <div className="kv-legend-h">edges (selected node)</div>
          {activeTraceTypes.map((t) => (
            <div key={t} className="kv-legend-row"><span className="kv-edge-sw" style={{ borderColor: TRACE_COLORS[t] ?? "#8f8f8f" }} />{t}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
