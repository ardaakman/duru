# duru plugin — manual acceptance checklist

Run against the kind demo (`dev/kind-demo.yaml`, see README "Try it").

- [ ] "Duru" appears in the sidebar; the route renders the live map for the kind cluster.
- [ ] The `crasher` pod is CrashLoopBackOff: its RS/namespace show a RED rollup dot while collapsed.
- [ ] Delete a web pod (`kubectl delete pod -n demo -l app=web --wait=false`) → surviving pods' dots stay put (ZERO movement); the `↻ N changes` pill appears; clicking it adopts the new pod.
- [ ] Search (`/`) reveals a pod buried under a collapsed ReplicaSet, selects and centers it.
- [ ] Selecting the `web` Service draws dashed trace edges and the edge legend section; Escape clears.
- [ ] Double-clicking a pod (or `⌖ focus` in the inspector) shows its DIRECT neighborhood only; `+N more` cards cap the noise; Escape returns to the tree.
- [ ] Dragging a node moves it; the position survives health updates and resets on re-layout.
- [ ] Inspector "open in Headlamp →" lands on the native details page.
- [ ] Toggling Headlamp's theme flips duru light/dark instantly.
- [ ] Search an alias (`depl`, `cm`) and a label value; the dropdown shows a `why` annotation (kind/ns/label) for non-name matches.
- [ ] Filter popover: picking a namespace + a kind + `problems only` scopes the map and re-layouts; chips remove individually or via `clear all`.
- [ ] `CRs` toggle populates the cluster's custom resources (searchable, owned CRs parent their Pods) and shows a brief loading state on first fetch; going over the per-CRD/global cap surfaces a `⚠` warning.
- [ ] KNOWN INTERACTION: `problems only` hides all custom resources — CRs carry no health (unknown, non-voting), so the problems filter prunes their entire subtree by design.
- [ ] KNOWN INTERACTION: with `problems only` active, a genuine health flip changes filter membership → re-layout + drag-override reset (intended: an appearing node needs a layout); plain health-dot updates still never move nodes.
