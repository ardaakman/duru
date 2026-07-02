import { FAMILY, HEALTH } from "./kinds.js";

const ROWS: [string, string][] = [
  ["controllers", FAMILY.controllers], ["pods / replicas", FAMILY.pods], ["networking", FAMILY.networking],
  ["config", FAMILY.config], ["storage", FAMILY.storage], ["secrets", FAMILY.secrets], ["identity", FAMILY.identity],
];

export function Legend() {
  return (
    <div className="kv-legend">
      <div className="kv-legend-h">legend</div>
      {ROWS.map(([l, c]) => (
        <div key={l} className="kv-legend-row"><span className="kv-sw" style={{ background: c }} />{l}</div>
      ))}
      <div className="kv-legend-sep" />
      <div className="kv-legend-row"><span className="kv-dot" style={{ background: HEALTH.ok }} />healthy</div>
      <div className="kv-legend-row"><span className="kv-mono">▸ 4</span>collapsed · click to expand</div>
    </div>
  );
}
