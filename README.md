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

## Design
Pipeline: ingest → normalize → relate (linkers) → model → render. See
`docs/superpowers/specs` for the full spec.
