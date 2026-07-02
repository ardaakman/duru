import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["templates/geist/app/index.tsx"],
  bundle: true,
  minify: true,
  format: "iife",
  outfile: "templates/geist/engine.bundle.js",
  jsx: "automatic",
  loader: { ".css": "text" },
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info",
});
console.log("built templates/geist/engine.bundle.js");
