import type { FastifyInstance } from "fastify";
import { ReportRequestSchema } from "@sprachweise/shared";
import type { Db } from "../db";
import { RETENTION_DAYS } from "../metrics/events";

let lastCleanupDay: string | undefined;

/** Deletes reports older than the retention window, at most once per process per UTC day. */
async function deleteExpiredReports(db: Db, onError: (err: unknown) => void): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  if (lastCleanupDay === today) return;
  lastCleanupDay = today;
  try {
    await db.query(
      `DELETE FROM translation_reports WHERE created_at < now() - make_interval(days => $1)`,
      [RETENTION_DAYS],
    );
  } catch (err) {
    lastCleanupDay = undefined;
    onError(err);
  }
}

/**
 * POST /api/report — a "Плохой перевод" click. Stored on its own, never with the install ID, so a
 * report can't be tied to anyone's usage (constitution III).
 */
export function registerReportRoute(app: FastifyInstance, db: Db): void {
  app.post("/api/report", async (request, reply) => {
    const parsed = ReportRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "invalid-request" });
    }
    const { source, output, level, density, model, promptVersion } = parsed.data;
    try {
      await db.query(
        `INSERT INTO translation_reports (source, output, level, density, model, prompt_version)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [source, output, level, density, model, promptVersion],
      );
    } catch (err) {
      request.log.error({ err }, "failed to store translation report");
      return reply.status(503).send({ error: "internal-failure" });
    }
    await deleteExpiredReports(db, (err) =>
      request.log.error({ err }, "failed to delete expired reports"),
    );
    return reply.status(204).send();
  });
}
