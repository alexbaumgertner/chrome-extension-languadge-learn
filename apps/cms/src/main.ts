import { buildApp } from "./build-app";
import { config } from "./config";

/**
 * Process entrypoint. Locally `pnpm dev` runs it with tsx; for Vercel, `pnpm build` bundles it to
 * `server.mjs`, which Vercel detects as the Fastify entry and serves as a single function. Kept
 * free of exports so importing the app (tests, scripts) never starts a listener.
 */
const app = buildApp();
app.listen({ port: Number(process.env.PORT ?? config.CMS_PORT), host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
