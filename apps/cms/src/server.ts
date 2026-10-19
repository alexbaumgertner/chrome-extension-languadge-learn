import { buildApp } from "./build-app";
import { config } from "./config";

/**
 * Process entrypoint. Vercel detects `src/server.ts` as the Fastify entry and serves the app as a
 * single function; locally `pnpm dev` runs it with tsx. Kept free of exports so importing the app
 * (tests, scripts) never starts a listener.
 */
const app = buildApp();
app.listen({ port: Number(process.env.PORT ?? config.CMS_PORT), host: "0.0.0.0" }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
