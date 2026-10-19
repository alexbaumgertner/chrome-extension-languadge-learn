// Bundles src/main.ts into ./server.mjs for Vercel. npm dependencies stay external (Vercel traces
// and ships them); workspace packages (TypeScript source) are inlined. Shipping plain JS sidesteps
// Vercel's own TypeScript compile, which type-checks without the project's strict settings.
import { build } from "esbuild";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const external = Object.entries(pkg.dependencies)
  .filter(([, version]) => !version.startsWith("workspace:"))
  .map(([name]) => name);

await build({
  entryPoints: ["src/main.ts"],
  outfile: "server.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  external,
  sourcemap: true,
  logLevel: "info",
});
