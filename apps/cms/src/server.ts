import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import { config, type Config } from "./config";
import { createNeonDb, withSchema, type Db } from "./db";
import { registerExercisesRoute } from "./routes/exercises";
import { registerTranslateRoute } from "./routes/translate";

/**
 * FR-007: no learner data may appear in any log output, including the framework's own
 * default request/response logging. Fastify's default serializers never log request/response
 * bodies, but they do log `remoteAddress`/`remotePort` — that's IP-linked data FR-007 explicitly
 * forbids, so the request serializer is overridden to strip it down to method/url only. Logging
 * is disabled entirely in tests to keep output quiet.
 */
export function buildApp(cfg: Config = config, db: Db = createNeonDb(cfg)): FastifyInstance {
  const app = Fastify({
    logger:
      process.env.NODE_ENV === "test"
        ? false
        : {
            level: "info",
            serializers: {
              req: (request: FastifyRequest) => ({ method: request.method, url: request.url }),
            },
          },
  });

  // The extension's background worker calls cross-origin without a host permission for the API,
  // so only the configured extension origins get CORS grants. This keeps other web pages from
  // spending the quota from a visitor's browser; it is not authentication.
  void app.register(cors, {
    origin: (origin, cb) =>
      cb(null, origin !== undefined && cfg.CORS_ALLOWED_ORIGINS.includes(origin)),
    methods: ["POST"],
  });

  registerTranslateRoute(app, cfg, withSchema(db));
  registerExercisesRoute(app, cfg);

  return app;
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const app = buildApp();
  app.listen({ port: config.CMS_PORT, host: "0.0.0.0" }, (err) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
  });
}
