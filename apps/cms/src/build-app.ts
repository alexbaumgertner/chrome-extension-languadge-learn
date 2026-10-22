import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import { config, type Config } from "./config";
import { createNeonDb, withSchema, type Db } from "./db";
import { registerEventsRoute } from "./routes/events";
import { registerExercisesRoute } from "./routes/exercises";
import { registerReportRoute } from "./routes/report";
import { LANDING_ASSETS } from "./landing/assets.generated";
import { pickLang, renderLanding } from "./landing/page";
import { PRIVACY_POLICY_HTML } from "./privacy/policy";
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

  const schemaDb = withSchema(db);
  registerTranslateRoute(app, cfg, schemaDb);
  registerExercisesRoute(app, cfg);
  registerEventsRoute(app, schemaDb);
  registerReportRoute(app, schemaDb);
  app.get("/api/health", async () => ({ ok: true }));
  app.get("/privacy", async (_request, reply) =>
    reply
      .type("text/html; charset=utf-8")
      .header("cache-control", "public, max-age=3600")
      .send(PRIVACY_POLICY_HTML),
  );

  const storeUrl = process.env.CHROME_STORE_URL || undefined;
  const sendLanding = (lang: "ru" | "uk", reply: FastifyReply) =>
    reply
      .type("text/html; charset=utf-8")
      .header("cache-control", "public, max-age=300")
      .send(renderLanding(lang, storeUrl));
  app.get("/", async (request, reply) =>
    sendLanding(
      pickLang(request.headers["accept-language"]),
      reply.header("vary", "accept-language"),
    ),
  );
  app.get("/ru", async (_request, reply) => sendLanding("ru", reply));
  app.get("/uk", async (_request, reply) => sendLanding("uk", reply));
  app.get<{ Params: { file: string } }>("/assets/:file", async (request, reply) => {
    const data = Object.hasOwn(LANDING_ASSETS, request.params.file)
      ? LANDING_ASSETS[request.params.file]
      : undefined;
    if (data === undefined) return reply.code(404).send({ error: "not_found" });
    return reply
      .type("image/png")
      .header("cache-control", "public, max-age=86400")
      .send(Buffer.from(data, "base64"));
  });

  return app;
}
