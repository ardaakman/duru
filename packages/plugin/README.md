# headlamp-plugin-duru

The [duru](../../README.md) map as a [Headlamp](https://headlamp.dev) plugin:
a live ownership tree of the current cluster — health rolled up onto every
collapsed node, double-click drill-down, search, an inspector for
relationships, and a `↻` pill that gates re-layout so the map never shifts
under you while pods churn.

## Build

```bash
npm run build   # from the repo root (builds @duru/core first)
```

produces `dist/main.js`. See the root README for install and the kind-cluster
demo. Developed with the official `@kinvolk/headlamp-plugin` toolchain
(`npm start` for hot reload; see the
[plugin development docs](https://headlamp.dev/docs/latest/development/plugins/)).

## License

Apache-2.0 — see the repository [LICENSE](../../LICENSE) and
[THIRD-PARTY-NOTICES.md](../../THIRD-PARTY-NOTICES.md).
