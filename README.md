# ami-kube (kubeviz)

Turn Kubernetes manifests (or an offline `kubectl get -o json` dump) into an
interactive, self-contained HTML map — a friendlier, truthful alternative to the
ArgoCD resource tree. Apache-2.0.

## Usage
```bash
npx tsx src/cli.ts ./manifests -o map.html   # interactive Geist HTML
npx tsx src/cli.ts ./manifests -o model.json # or the raw GraphModel JSON
npx tsx src/cli.ts ./manifests               # JSON to stdout
```
Open `map.html` in any browser (works offline). Cluster (by namespace) and
Layered (by resource tier) layouts; click a node for its summary + raw manifest.

## Live cluster (recommended for the full tree)

The deep ownership tree (ReplicaSets, Pods, per-node DaemonSet pods) and health
dots come from a cluster dump. Capture one (offline, no live connection needed
afterward):

```bash
kubectl get nodes,pods,svc,deploy,rs,sts,ds,cronjob,job,cm,secret,pvc,pv,sc,sa,ingress,hpa,networkpolicy -A -o json > cluster.json
kviz cluster.json -o map.html
```

From plain manifests (no dump), controllers render as leaves (no live pods) and
health is neutral — this is intentional (kubeviz never fabricates runtime state).

## Building

The renderer is a React + React Flow app bundled by esbuild into
`templates/geist/engine.bundle.js` and inlined into the output. `npm run build`
runs the web bundle then `tsc`; `npm test` builds the bundle first (`pretest`).

## Design
Pipeline: ingest → normalize → relate (linkers) → model → render. See
`docs/superpowers/specs` for the full spec.
