import { z } from "zod";

const ConfigSchema = z.object({
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.5-flash-lite"),
  /** Gemini 3.x `thinkingLevel`; empty string omits thinkingConfig for models that reject it. */
  GEMINI_THINKING_LEVEL: z.enum(["", "minimal", "low", "medium", "high"]).default("minimal"),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  DATABASE_URL: z.string().min(1),
  CMS_PORT: z.coerce.number().int().positive().default(8787),
  TRANSLATE_MAX_CHARS: z.coerce.number().int().positive().default(5000),
  /** Global budget kill switch across all users (cache hits don't count). */
  GEMINI_DAILY_REQUEST_ALLOWANCE: z.coerce.number().int().positive().default(1500),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return ConfigSchema.parse(env);
}

export const config: Config = loadConfig();
