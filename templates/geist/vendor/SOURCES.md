# Third-party libraries

The interactive renderer is a React app bundled at build time (esbuild) into
`../engine.bundle.js`. Bundled dependencies:

- **React** (MIT) — https://react.dev
- **React Flow** (`reactflow`, MIT) — https://reactflow.dev
- **dagre** (MIT) — https://github.com/dagrejs/dagre

Versions are pinned in the repo `package.json` devDependencies. No libraries are
loaded from a CDN at render time — the bundle is fully inlined into the emitted HTML.
