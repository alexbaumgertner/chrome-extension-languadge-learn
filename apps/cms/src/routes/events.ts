import type { FastifyInstance } from "fastify";
import { EventsRequestSchema } from "@sprachweise/shared";
import type { Db } from "../db";
import { deleteExpiredEvents, insertEvents } from "../metrics/events";

/**
 * POST /api/events — usage-metric events from the extension, the only request that carries the
 * install ID (constitution III). Never logged: Fastify's request serializer logs method and URL only.
 */
export function registerEventsRoute(app: FastifyInstance, db: Db): void {
  app.post("/api/events", async (request, reply) => {
    const parsed = EventsRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid-request" });
    }
    try {
      await insertEvents(db, parsed.data.installId, parsed.data.events);
    } catch (err) {
      request.log.error({ err }, "failed to store metric events");
      return reply.status(503).send({ error: "internal-failure" });
    }
    await deleteExpiredEvents(db, (err) =>
      request.log.error({ err }, "failed to delete expired events"),
    );
    return reply.status(204).send();
  });
}
