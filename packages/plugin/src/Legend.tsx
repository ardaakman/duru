import { TRACE_COLORS } from "@duru/core";
import { FAMILY, HEALTH } from "./kinds";

const ROWS: [string, keyof typeof FAMILY, string][] = [
  ["controllers", "controllers", FAMILY.controllers], ["pods / replicas", "pods", FAMILY.pods],
  ["networking", "networking", FAMILY.networking], ["config", "config", FAMILY.config],
  ["storage", "storage", FAMILY.storage], ["secrets", "secrets", FAMILY.secrets], ["identity", "identity", FAMILY.identity],
];

export function Legend({ activeTraceTypes, dimmed, onToggleFamily }: {
  activeTraceTypes: string[]; dimmed: Set<string>; onToggleFamily: (f: string) => void;
}) {
  return (
    <div className="duru-legend">
      <div className="duru-legend-h">legend · click to dim</div>
      {ROWS.map(([label, fam, color]) => (
        <button key={fam} className={"duru-legend-row duru-legend-btn" + (dimmed.has(fam) ? " off" : "")} onClick={() => onToggleFamily(fam)}>
          <span className="duru-sw" style={{ background: color }} />{label}
        </button>
      ))}
      <div className="duru-legend-sep" />
      <div className="duru-legend-row"><span className="duru-dot" style={{ background: HEALTH.ok }} />healthy</div>
      <div className="duru-legend-row"><span className="duru-dot duru-ring" style={{ background: HEALTH.ok }} />healthy · partly unobserved</div>
      <div className="duru-legend-row"><span className="duru-mono">▸ 4</span>collapsed · click to expand</div>
      {activeTraceTypes.length ? (
        <div className="duru-legend-edges">
          <div className="duru-legend-sep" />
          <div className="duru-legend-h">edges (selected node)</div>
          {activeTraceTypes.map((t) => (
            <div key={t} className="duru-legend-row"><span className="duru-edge-sw" style={{ borderColor: TRACE_COLORS[t] ?? "#8f8f8f" }} />{t}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
