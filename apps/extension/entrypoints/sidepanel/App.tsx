import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnyMessageSchema,
  GetPendingSelectionResponseSchema,
  SELECTION_MAX_CHARS,
  TranslateSelectionResponseSchema,
  type GetLearnerSettingsResponse,
  type SelectionPayload,
  type TranslateSelectionResponse,
} from "@sprachweise/shared";
import { sendMessage } from "@/lib/messaging/send";
import { playDictationAudio } from "@/lib/audio/play-dictation";
import { plainWord, renderSpansHtml, SPAN_CLASS } from "@/lib/selection/render-spans";
import { t, type MessageKey } from "@/lib/i18n";

type Failure = Extract<TranslateSelectionResponse, { ok: false }>["reason"];
type Success = Extract<TranslateSelectionResponse, { ok: true }>;

const FAILURE_NOTICE: Record<Failure, MessageKey> = {
  offline: "noticeOffline",
  unavailable: "noticeUnavailable",
  limit: "noticeLimit",
  "too-long": "noticeFailed",
  failed: "noticeFailed",
};

export default function App() {
  const [selection, setSelection] = useState<SelectionPayload | null>(null);
  const [level, setLevel] = useState<string | null>(null);

  useEffect(() => {
    // A choice made before this page was listening is waiting in the background.
    void sendMessage<unknown>({ type: "GET_PENDING_SELECTION" }).then((raw) => {
      const parsed = GetPendingSelectionResponseSchema.safeParse(raw);
      if (parsed.success && parsed.data.selection) setSelection(parsed.data.selection);
    });
    void sendMessage<GetLearnerSettingsResponse>({ type: "GET_LEARNER_SETTINGS" }).then(
      (settings) => setLevel(settings.level),
    );
    const onMessage = (raw: unknown) => {
      const parsed = AnyMessageSchema.safeParse(raw);
      if (parsed.success && parsed.data.type === "SELECTION_TOOL") {
        setSelection(parsed.data.selection);
      }
    };
    chrome.runtime.onMessage.addListener(onMessage);
    return () => chrome.runtime.onMessage.removeListener(onMessage);
  }, []);

  if (!selection) {
    return (
      <div className="side">
        <Header level={level} />
        <p className="side-empty">{t("sideEmpty")}</p>
      </div>
    );
  }

  return (
    <div className="side">
      <Header level={level} />
      <div className="card side-original">
        <div className="card-kicker">{t("sideOriginal")}</div>
        <p className="side-text">{selection.text}</p>
        {selection.truncated && (
          <p className="side-note">{t("sideTruncated", String(SELECTION_MAX_CHARS))}</p>
        )}
      </div>
      {selection.tool === "translate" ? (
        <TranslateResult key={selection.id} text={selection.text} />
      ) : (
        <SpeakResult key={selection.id} text={selection.text} />
      )}
    </div>
  );
}

function Header({ level }: { level: string | null }) {
  return (
    <div className="side-header">
      <span className="brand-mark" aria-hidden="true">
        S
      </span>
      <h1 className="side-title">Sprachweise</h1>
      {level && <span className="tag tag-neutral">{t("panelLevel", level)}</span>}
    </div>
  );
}

function TranslateResult({ text }: { text: string }) {
  const [result, setResult] = useState<TranslateSelectionResponse | "loading">("loading");
  const [picked, setPicked] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true; // a newer choice replaced this one: its answer is dropped
    setResult("loading");
    setPicked(null);
    void sendMessage<unknown>({ type: "TRANSLATE_SELECTION", text }).then((raw) => {
      if (!current) return;
      const parsed = TranslateSelectionResponseSchema.safeParse(raw);
      setResult(parsed.success ? parsed.data : { ok: false, reason: "failed" });
    });
    return () => {
      current = false;
    };
  }, [text, attempt]);

  if (result === "loading") {
    return (
      <p className="side-note" role="status">
        {t("noticeTranslating")}
      </p>
    );
  }
  if (!result.ok) {
    return (
      <div className="side-error" role="alert">
        <p>{t(FAILURE_NOTICE[result.reason])}</p>
        <button type="button" className="btn btn-secondary" onClick={() => setAttempt(attempt + 1)}>
          {t("reportRetry")}
        </button>
      </div>
    );
  }
  return <Translation result={result} picked={picked} onPick={setPicked} />;
}

function Translation({
  result,
  picked,
  onPick,
}: {
  result: Success;
  picked: number | null;
  onPick: (index: number) => void;
}) {
  const html = renderSpansHtml(result.text, result.spans);
  const wordAt = (target: EventTarget | null): number | null => {
    const el = (target as HTMLElement | null)?.closest<HTMLElement>(`.${SPAN_CLASS}`);
    return el ? Number(el.dataset.i) : null;
  };
  const span = picked === null ? undefined : result.spans[picked];

  return (
    <div className="card side-result">
      <div className="card-kicker">{t("sideTranslated")}</div>
      {/* The text is the schema-checked safe subset (bare strong/em); see TranslateSelectionResponse. */}
      <p
        className="side-text side-german"
        lang="de"
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={(e) => {
          const index = wordAt(e.target);
          if (index !== null) onPick(index);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          const index = wordAt(e.target);
          if (index === null) return;
          e.preventDefault();
          onPick(index);
        }}
      />
      {span ? (
        <p className="side-gloss" role="status">
          <strong lang="de">{plainWord(result.text, span)}</strong>
          <span className="side-gloss-sep" aria-hidden="true" />
          <span>{span.russian}</span>
        </p>
      ) : (
        result.spans.length > 0 && <p className="side-note">{t("sideTapWord")}</p>
      )}
    </div>
  );
}

function SpeakResult({ text }: { text: string }) {
  const supported = typeof window.speechSynthesis !== "undefined";
  const [speaking, setSpeaking] = useState(false);
  const mounted = useRef(true);

  const play = useCallback(async () => {
    setSpeaking(true);
    await playDictationAudio(text, "normal");
    if (mounted.current) setSpeaking(false);
  }, [text]);

  useEffect(() => {
    mounted.current = true;
    // Chrome may refuse speech nobody asked for in this page; the button below always works.
    if (supported) void play();
    return () => {
      mounted.current = false;
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported, play]);

  if (!supported) return <p className="side-error">{t("sideNoSpeech")}</p>;
  return (
    <div className="side-actions">
      <button
        type="button"
        className="btn btn-primary"
        disabled={speaking}
        onClick={() => void play()}
      >
        {t("dictationListen")}
      </button>
    </div>
  );
}
