# duru

See your Kubernetes cluster clearly: an ownership tree instead of arrow soup —
health rolled up onto every collapsed node, drill-down and focus instead of
sprawl, relationships in an inspector and on-demand traces instead of a
hairball. Truthful by design: duru never fabricates runtime state.

duru ships two ways from one codebase:

- **CLI** — turn manifests or an offline `kubectl get -o json` dump into ONE
  interactive, self-contained HTML file. Share it, attach it to a PR, open it
  offline.
- **Headlamp plugin** — the same map, LIVE, inside
  [Headlamp](https://headlamp.dev): health updates in real time, topology
  changes gated behind a `↻` pill so the map never shifts under you, focus mode
  for any pod's full neighborhood, dark mode following Headlamp's theme.
  Lives in [`packages/`](packages/).

Apache-2.0. The plugin is powered by Headlamp but duru is an independent
project, not affiliated with or endorsed by Headlamp, the CNCF, or The Linux
Foundation.

## CLI

```bash
npx tsx src/cli.ts ./manifests -o map.html   # interactive HTML
npx tsx src/cli.ts ./manifests -o model.json # or the raw GraphModel JSON
npx tsx src/cli.ts ./manifests               # JSON to stdout
```

Open `map.html` in any browser (works offline). Click a node for its summary +
raw manifest; collapse, drill down, search, trace relationships.

### Live cluster (recommended for the full tree)

The deep ownership tree (ReplicaSets, Pods, per-node DaemonSet pods) and health
dots come from a cluster dump. Capture one (offline, no live connection needed
afterward):

```bash
kubectl get nodes,pods,svc,deploy,rs,sts,ds,cronjob,job,cm,secret,pvc,pv,sc,sa,ingress,hpa,networkpolicy -A -o json > cluster.json
duru cluster.json -o map.html
```

From plain manifests (no dump), controllers render as leaves (no live pods) and
health is neutral — intentional: no fabricated runtime state.

### Health semantics

Dots: green = healthy, amber = degraded/pending, red = failed/crashlooping, grey = **unobserved**
(the input carried no `status` — plain manifests, or a dump object without one; the CLI reads a
static file, so there is no "fetch failed" state). Rollup: a **collapsed** node's dot shows the
worst health among its pod/workload descendants; a green dot with a grey ring means "healthy
where observed, some pods/workloads unobserved". Config objects (ConfigMaps, Services, …) have
no runtime health and never affect rollup.

### Large clusters

`duru cluster.json -o map.html --slim` omits embedded manifests (the inspector hides its
manifest section). Without `--slim`, the CLI warns on stderr when the output exceeds 5 MB.

## Headlamp plugin

- [`packages/core`](packages/core) — `@duru/core`: the pipeline as a library
  (normalize → relate → model, plus tree/rollup/trace/focus/diff logic). No React.
- [`packages/plugin`](packages/plugin) — `headlamp-plugin-duru`: live cluster
  data in, map out. See its [README](packages/plugin/README.md).

Live-mode extras on top of the CLI map: per-node health patches applied
instantly with zero layout movement, the `↻ N changes` pill for topology churn,
**focus mode** (double-click a pod or hit `⌖ focus` in the inspector for its
capped 2-hop neighborhood — mounts, ServiceAccount, selecting Service, routing
Ingress, sibling pods), native "open in Headlamp →" deep links, and dark mode
that follows Headlamp's theme live.

### Try it (local kind cluster)

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

### Plugin acceptance checklist (manual)

- [ ] "Duru" appears in the sidebar; the route renders the live map for the kind cluster.
- [ ] The `crasher` pod is CrashLoopBackOff: its RS/namespace show a RED rollup dot while collapsed.
- [ ] `kubectl delete pod -n demo -l app=web --wait=false` → surviving pods' dots stay put (ZERO movement); the `↻ N changes` pill appears; clicking it adopts the new pod.
- [ ] Search (`/`) reveals a pod buried under a collapsed ReplicaSet, selects and centers it.
- [ ] Selecting the `web` Service draws dashed trace edges (expand the RS first) and the edge legend section; Escape clears.
- [ ] Double-clicking a pod (or `⌖ focus` in the inspector) opens its 2-hop neighborhood; `+N more` cards cap the noise; Escape returns to the tree.
- [ ] Inspector "open in Headlamp →" lands on the native details page.
- [ ] Toggling Headlamp's theme flips duru light/dark instantly.

## Building

Root `npm run build` = CLI web bundle + tsc, then `@duru/core` (tsc) and
`headlamp-plugin-duru` (Headlamp toolchain → `packages/plugin/dist/main.js`).
`npm test` runs every workspace's vitest suites.

## Design

Pipeline: ingest → normalize → relate (linkers) → model → render. The plugin
feeds the same pipeline from Headlamp's live hooks instead of files.
Third-party credits: [NOTICE](NOTICE) and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
