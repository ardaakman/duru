# duru

*duru* (Turkish: **clear, limpid** — like clear water) makes Kubernetes clusters
simpler to understand: a live map of your cluster as an ownership tree — health
rolled up onto every collapsed node, drill-down instead of sprawl, relationships
in an inspector instead of arrow soup.

duru is a plugin for (and **powered by**) [Headlamp](https://headlamp.dev).
It is an independent project, not affiliated with or endorsed by Headlamp,
the CNCF, or The Linux Foundation.

**Status: v1 in development.**

## Packages

- `@duru/core` — the pure pipeline: k8s objects → ownership graph model
  (normalize → relate → model), plus tree/rollup/trace/diff logic. No React.
- `headlamp-plugin-duru` — the Headlamp plugin: live cluster data in, map out.

## License

Apache-2.0 — see [LICENSE](LICENSE) and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## Try it (local kind cluster)

```bash
kind create cluster --name duru-demo
kubectl --context kind-duru-demo apply -f dev/kind-demo.yaml

npm install && npm run build
```

**Headlamp desktop:** copy the plugin into your plugins dir and restart Headlamp:

```bash
mkdir -p ~/.config/Headlamp/plugins/duru
cp packages/plugin/dist/main.js packages/plugin/package.json ~/.config/Headlamp/plugins/duru/
```

**Dev loop (hot reload):**

```bash
cd packages/plugin && npm start   # with Headlamp running against the kind cluster
```

## v1 acceptance checklist (manual)

- [ ] "Duru" appears in the sidebar; the route renders the live map for the kind cluster.
- [ ] The `crasher` pod is CrashLoopBackOff: its RS/namespace show a RED rollup dot while collapsed.
- [ ] `kubectl delete pod -n demo -l app=web --wait=false` → surviving pods' dots stay put (ZERO movement); the `↻ N changes` pill appears; clicking it adopts the new pod.
- [ ] Search (`/`) reveals a pod buried under a collapsed ReplicaSet, selects and centers it.
- [ ] Selecting the `web` Service draws dashed trace edges (expand the RS first) and the edge legend section; Escape clears.
- [ ] Inspector "open in Headlamp →" lands on the native details page.
- [ ] Legend family click dims cards without moving them.
