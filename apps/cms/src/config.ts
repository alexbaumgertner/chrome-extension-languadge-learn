import { z } from "zod";

const ConfigSchema = z.object({
  GOOGLE_TRANSLATE_API_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  CMS_DB_PATH: z.string().min(1).default("./data/cms.sqlite"),
  CMS_PORT: z.coerce.number().int().positive().default(8787),
  TRANSLATE_MAX_CHARS: z.coerce.number().int().positive().default(5000),
  TRANSLATE_MONTHLY_CHAR_ALLOWANCE: z.coerce.number().int().positive().default(500000),
  GEMINI_DAILY_REQUEST_ALLOWANCE: z.coerce.number().int().positive().default(1500),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return ConfigSchema.parse(env);
}

export const config: Config = loadConfig();
