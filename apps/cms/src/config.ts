import { z } from "zod";
import { TRANSLATE_MAX_CHARS } from "@sprachweise/shared";

const ConfigSchema = z.object({
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.8-flash"),
  /** Gemini 3.x `thinkingLevel`; empty string omits thinkingConfig for models that reject it. */
  GEMINI_THINKING_LEVEL: z.enum(["", "minimal", "low", "medium", "high"]).default("low"),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  DATABASE_URL: z.string().min(1),
  CMS_PORT: z.coerce.number().int().positive().default(8787),
  TRANSLATE_MAX_CHARS: z.coerce.number().int().positive().default(TRANSLATE_MAX_CHARS),
  /** Global budget kill switch across all users (cache hits don't count). */
  GEMINI_DAILY_REQUEST_ALLOWANCE: z.coerce.number().int().positive().default(1500),
  /**
   * Comma-separated exact origins allowed to call the API, e.g.
   * `chrome-extension://<store id>,chrome-extension://<unpacked dev id>`. Empty = no CORS grants.
   */
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default("")
    .transform((v) =>
      v
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    ),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return ConfigSchema.parse(env);
}

export const config: Config = loadConfig();
