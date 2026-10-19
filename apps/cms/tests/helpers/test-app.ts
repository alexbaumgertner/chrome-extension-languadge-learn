import { PGlite } from "@electric-sql/pglite";
import type { FastifyInstance } from "fastify";
import { config, type Config } from "../../src/config";
import type { Db } from "../../src/db";
import { buildApp } from "../../src/build-app";

/** An in-memory Postgres (PGlite) behind the production `Db` interface — fresh per call. */
export function createTestDb(): Db {
  const pg = new PGlite();
  return {
    query: async <T>(text: string, params: unknown[] = []) =>
      (await pg.query<T>(text, params)).rows,
  };
}

export function buildTestApp(cfg: Config = config, db: Db = createTestDb()): FastifyInstance {
  return buildApp(cfg, db);
}
