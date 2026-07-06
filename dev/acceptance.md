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
