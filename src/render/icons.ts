// Original k8s-kind icon glyphs (Apache-2.0, ours). Inner SVG markup only; the
// stroke colour is applied per-node by iconDataUri. 24x24 viewBox.
export const GLYPH: Record<string, string> = {
  deployment: '<path d="M12 3l8 4-8 4-8-4 8-4z"/><path d="M4 12l8 4 8-4"/><path d="M4 16l8 4 8-4"/>',
  statefulset: '<rect x="5" y="4" width="14" height="4" rx="1"/><rect x="5" y="10" width="14" height="4" rx="1"/><rect x="5" y="16" width="14" height="4" rx="1"/>',
  daemonset: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8v8M12 8v8M16 8v8"/>',
  job: '<rect x="4" y="6" width="16" height="14" rx="1.5"/><path d="M9 6V4h6v2"/><path d="M9 13l2 2 4-4"/>',
  pod: '<path d="M12 2.5l8 4.2v8.6l-8 4.2-8-4.2V6.7l8-4.2z"/><path d="M9 9.5h6v5H9z"/>',
  service: '<circle cx="12" cy="6" r="2.2"/><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="18" r="2.2"/><path d="M12 8.2v3.4M12 12l-5 4M12 12l5 4"/>',
  ingress: '<path d="M4 4v16M20 4v16"/><path d="M4 12h11"/><path d="M11 8l4 4-4 4"/>',
  configmap: '<path d="M5 7h14M5 12h14M5 17h14"/><circle cx="9" cy="7" r="1.6" fill="CURRENT" stroke="none"/><circle cx="15" cy="12" r="1.6" fill="CURRENT" stroke="none"/><circle cx="9" cy="17" r="1.6" fill="CURRENT" stroke="none"/>',
  secret: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15" r="1.3" fill="CURRENT" stroke="none"/>',
  key: '<circle cx="8" cy="12" r="3.2"/><path d="M11 12h9"/><path d="M17 12v3"/><path d="M20 12v2.5"/>',
  pvc: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16"/><path d="M8 13.5h8M8 16.5h5"/>',
  storageclass: '<path d="M5 5h14l-1 6H6z"/><path d="M6 11l1 8h10l1-8"/><path d="M10 15h4"/>',
  node: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 8.5l4 2.2v3.6l-4 2.2-4-2.2v-3.6l4-2.2z"/>',
  shield: '<path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3z"/>',
  hpa: '<path d="M4 16a8 8 0 0 1 16 0"/><path d="M12 16l4-4"/><circle cx="12" cy="16" r="1.3" fill="CURRENT" stroke="none"/>',
  crd: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>',
};

export function iconDataUri(iconKey: string, color: string): string {
  const inner = (GLYPH[iconKey] ?? GLYPH.crd).replace(/CURRENT/g, color);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="' +
    color + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
