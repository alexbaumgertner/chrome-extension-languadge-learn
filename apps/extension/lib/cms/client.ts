import {
  ExercisesRequestSchema,
  ExercisesResponseSchema,
  TranslateRequestSchema,
  TranslateResponseSchema,
  type CmsExercise,
  type CmsExercisesRequest,
  type CmsTranslateRequest,
  type CmsTranslateResponse,
  type Level,
} from "@sprachweise/shared";
import { CMS_BASE_URL } from "@/lib/config";

export class CmsFetchError extends Error {}

/**
 * `fetch()` rejects with a `TypeError` for network-level failures (offline,
 * DNS, connection refused) — a more reliable offline signal than
 * `navigator.onLine`, which doesn't always reflect real connectivity inside
 * a service worker. A `CmsFetchError` means we got a response (or parsed
 * one) and it just wasn't usable, which is a distinct "fetch-failed" case.
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}

async function postJson<TReq, TRes>(
  path: string,
  requestSchema: { parse: (v: TReq) => TReq },
  responseSchema: { safeParse: (v: unknown) => { success: boolean; data?: TRes } },
  body: TReq,
): Promise<TRes> {
  const validatedBody = requestSchema.parse(body);
  const res = await fetch(`${CMS_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validatedBody),
  });
  if (!res.ok) {
    throw new CmsFetchError(`${path} responded ${res.status}`);
  }
  const json = await res.json();
  const parsed = responseSchema.safeParse(json);
  if (!parsed.success || parsed.data === undefined) {
    throw new CmsFetchError(`${path} response failed schema validation`);
  }
  return parsed.data;
}

export function translateParagraph(
  text: string,
  level: Level,
  topic: string,
): Promise<CmsTranslateResponse> {
  const request: CmsTranslateRequest = { text, level, topic };
  return postJson("/api/translate", TranslateRequestSchema, TranslateResponseSchema, request);
}

export async function generateExercises(
  variantText: string,
  markedVocab: CmsExercisesRequest["markedVocab"],
  level: Level,
  topic: string,
): Promise<CmsExercise[]> {
  const request: CmsExercisesRequest = { variantText, markedVocab, level, topic };
  const response = await postJson(
    "/api/exercises",
    ExercisesRequestSchema,
    ExercisesResponseSchema,
    request,
  );
  return response.exercises;
}

export async function fetchTtsAudio(
  sentence: string,
  rate: "normal" | "slow",
): Promise<{ blob: Blob; mimeType: string }> {
  const res = await fetch(`${CMS_BASE_URL}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sentence, rate }),
  });
  if (!res.ok) {
    throw new CmsFetchError(`/api/tts responded ${res.status}`);
  }
  const mimeType = res.headers.get("Content-Type") ?? "audio/mpeg";
  const blob = await res.blob();
  return { blob, mimeType };
}
