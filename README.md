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
