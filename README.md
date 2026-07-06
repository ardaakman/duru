# duru

Understand your infrastructure better, easier.

Kubernetes clusters are hard to reason about: dashboards give you tables,
resource trees drown you in arrows. duru draws your cluster as a calm
ownership tree — health rolled up onto every collapsed node, drill-down and
focus instead of sprawl, relationships shown when you ask, never fabricated.
You open it and see what's running and what's broken, at a glance.

Two ways to use it, one codebase:

- CLI — manifests or a `kubectl get -o json` dump → one self-contained
  interactive HTML file. Works offline; attach it to a PR or an incident doc.
- [Headlamp](https://headlamp.dev) plugin — the same map, live: real-time
  health, a `↻` pill that gates re-layout so the map never shifts under you,
  focus mode for any node's direct neighborhood, draggable nodes, dark mode,
  search with alias/label matching, a namespace/kind/`problems only` Filter,
  and a `CRs` toggle to bring in the cluster's custom resources.

## CLI

```bash
npx tsx src/cli.ts ./manifests -o map.html
```

For the full tree (pods, real health), feed it a dump:

```bash
kubectl get nodes,pods,svc,deploy,rs,sts,ds,cronjob,job,cm,secret,pvc,pv,sc,sa,ingress,hpa,networkpolicy -A -o json > cluster.json
duru cluster.json -o map.html          # add --slim on big clusters
```

Dots: green healthy · amber degraded · red failing · grey unobserved (no
status in the input — duru never invents runtime state). A collapsed node
shows the worst health hiding beneath it.

## Headlamp plugin

Lives in [`packages/`](packages/) (`@duru/core` + `headlamp-plugin-duru`).

Install: one command drops the prebuilt plugin into Headlamp's plugins
folder. Restart Headlamp and Duru appears in the sidebar for every cluster.

Linux:

```bash
mkdir -p ~/.config/Headlamp/plugins
curl -L https://github.com/ardaakman/duru/releases/latest/download/duru-headlamp-plugin.tar.gz | tar xz -C ~/.config/Headlamp/plugins
```

macOS:

```bash
mkdir -p ~/Library/Application\ Support/Headlamp/plugins
curl -L https://github.com/ardaakman/duru/releases/latest/download/duru-headlamp-plugin.tar.gz | tar xz -C ~/Library/Application\ Support/Headlamp/plugins
```

Windows (PowerShell): extract the same tarball into
`$env:APPDATA\Headlamp\Config\plugins`.

Building from source instead: `npm install && npm run build`, then copy
`packages/plugin/dist/main.js` and `packages/plugin/package.json` into
`<plugins-dir>/duru/`. No cluster handy? There's a demo:

```bash
kind create cluster --name duru-demo
kubectl --context kind-duru-demo apply -f dev/kind-demo.yaml
```

Developing duru itself? Two terminals:

```bash
./dev/headlamp.sh up   # local Headlamp container (uses your kubeconfig; trusted networks only)
npm run dev            # watch-build + auto-deploy; refresh the tab after each rebuild
```

Manual checklist: [dev/acceptance.md](dev/acceptance.md).

## License

Apache-2.0 — [LICENSE](LICENSE), [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
Powered by Headlamp; independent project, not affiliated with or endorsed by
Headlamp, the CNCF, or The Linux Foundation.

---

A note: this isn't meant to be a revelation. It's just me making a k8s
visualizer that's easy to parse and play around with — instead of the current
solutions out there — and adding the bits I find useful along the way, like
focusing on a node to see only what it actually touches.
