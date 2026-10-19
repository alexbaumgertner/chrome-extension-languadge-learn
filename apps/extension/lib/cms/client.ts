import {
  type ClientErrorCode,
  ExercisesRequestSchema,
  ReportRequestSchema,
  ExercisesResponseSchema,
  TranslateRequestSchema,
  TranslateResponseSchema,
  type CmsExercise,
  type CmsExercisesRequest,
  type CmsTranslateRequest,
  type CmsTranslateResponse,
  type Level,
  type ReportRequest,
  type TranslateParagraphResponse,
} from "@sprachweise/shared";
import { CMS_BASE_URL } from "@/lib/config";

export class CmsFetchError extends Error {
  /** The HTTP status when a response arrived but was unusable; undefined for a schema failure. */
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/**
 * `fetch()` rejects with a `TypeError` whenever no usable response arrived: no network, DNS,
 * connection refused, or a response the browser blocked for CORS — `classifyTranslateFailure`
 * tells these apart. A `CmsFetchError` means a response arrived (or was parsed) but wasn't usable.
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}

type FailureReason = Extract<TranslateParagraphResponse, { ok: false }>["reason"];

export interface TranslateFailure {
  /** Recorded in the client_error event. */
  code: ClientErrorCode;
  /** Shown to the learner. */
  reason: FailureReason;
  httpStatus: number | null;
}

/**
 * Whether the backend answers at all. A `no-cors` request needs no CORS grant (the response is
 * opaque), so it succeeds when the server is up even if it refuses this extension's origin.
 */
async function backendAnswers(): Promise<boolean> {
  try {
    await fetch(`${CMS_BASE_URL}/`, {
      mode: "no-cors",
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Sorts a failed /api/translate call into what the learner is told and what the error event
 * records. A rejected fetch (TypeError) means no usable response: no network at all if the
 * browser says it is offline; otherwise a probe tells a backend that is down or unreachable from
 * one that answered but whose response the browser blocked (CORS).
 */
export async function classifyTranslateFailure(error: unknown): Promise<TranslateFailure> {
  if (error instanceof CmsFetchError) {
    const status = error.status ?? null;
    if (status === 413)
      return { code: "translate-too-long", reason: "too-long", httpStatus: status };
    if (status === 429) return { code: "translate-limit", reason: "limit", httpStatus: status };
    if (status !== null && status >= 500) {
      return { code: "translate-server-error", reason: "unavailable", httpStatus: status };
    }
    return { code: "translate-failed", reason: "failed", httpStatus: status };
  }
  if (isNetworkError(error)) {
    if (!navigator.onLine)
      return { code: "translate-offline", reason: "offline", httpStatus: null };
    if (await backendAnswers()) {
      return { code: "translate-cors", reason: "unavailable", httpStatus: null };
    }
    return { code: "translate-unreachable", reason: "unavailable", httpStatus: null };
  }
  return { code: "translate-failed", reason: "failed", httpStatus: null };
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
    throw new CmsFetchError(`${path} responded ${res.status}`, res.status);
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

/** Sends a "Плохой перевод" report. Throws like the other calls; the server answers 204. */
export async function sendReport(report: ReportRequest): Promise<void> {
  const res = await fetch(`${CMS_BASE_URL}/api/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ReportRequestSchema.parse(report)),
  });
  if (!res.ok) throw new CmsFetchError(`/api/report responded ${res.status}`, res.status);
}
