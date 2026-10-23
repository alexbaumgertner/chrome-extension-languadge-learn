// Validates a backend response body with the schema the extension uses (lib/cms/client.ts), so
// the release smoke test fails on a body the extension would reject.
//
//   pnpm --filter @sprachweise/cms exec tsx .github/scripts/check-api-response.ts <route> <file>
//
// <route> is translate or exercises. Prints a one-line summary; exits 1 on invalid JSON or a
// schema mismatch.
import { readFileSync } from "node:fs";
import process from "node:process";
import {
  ExercisesResponseSchema,
  TranslateResponseSchema,
} from "../../packages/shared/src/schemas/cms";

const schemas = { translate: TranslateResponseSchema, exercises: ExercisesResponseSchema };
const [route, file] = process.argv.slice(2);
const schema = schemas[route as keyof typeof schemas];
if (!schema || !file) {
  console.log(`usage: check-api-response.ts <${Object.keys(schemas).join("|")}> <file>`);
  process.exit(1);
}

let json: unknown;
try {
  json = JSON.parse(readFileSync(file, "utf8"));
} catch {
  console.log("body is not JSON");
  process.exit(1);
}
const parsed = schema.safeParse(json);
if (!parsed.success) {
  const issue = parsed.error.issues[0];
  console.log(`body fails the schema: ${issue?.path.join(".") || "(root)"} ${issue?.message}`);
  process.exit(1);
}
console.log(
  "exercises" in parsed.data
    ? `${parsed.data.exercises.length} exercises`
    : `${parsed.data.markedVocab.length} marked words`,
);
