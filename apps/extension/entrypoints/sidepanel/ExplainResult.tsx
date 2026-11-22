import { useEffect, useState } from "react";
import {
  AddToVocabularyResponseSchema,
  ExplainSelectionResponseSchema,
  type ExplainResponse,
  type ExplainSelectionResponse,
  type Pos,
} from "@sprachweise/shared";
import { sendMessage } from "@/lib/messaging/send";
import { explainSegments } from "@/lib/selection/explain-segments";
import { t, type MessageKey } from "@/lib/i18n";

type Failure = Extract<ExplainSelectionResponse, { ok: false }>["reason"];

const FAILURE_NOTICE: Record<Failure, MessageKey> = {
  offline: "noticeOffline",
  unavailable: "noticeUnavailable",
  limit: "noticeLimit",
  "too-long": "noticeFailed",
  failed: "noticeFailed",
};

const POS_LABEL: Record<Pos, MessageKey> = {
  noun: "posNoun",
  verb: "posVerb",
  auxiliary: "posAuxiliary",
  modal: "posModal",
  adjective: "posAdjective",
  adverb: "posAdverb",
  pronoun: "posPronoun",
  article: "posArticle",
  preposition: "posPreposition",
  conjunction: "posConjunction",
  particle: "posParticle",
  numeral: "posNumeral",
  interjection: "posInterjection",
  other: "posOther",
};

/**
 * The "Explain" tool: Russian translation, the German text word by word (tap a word for its form
 * and meaning, and to add its dictionary form to the vocabulary) and 1 to 3 grammar notes. Every
 * string the model wrote is shown as text, never as HTML.
 */
export function ExplainResult({ text }: { text: string }) {
  const [result, setResult] = useState<ExplainSelectionResponse | "loading">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true; // a newer choice replaced this one: its answer is dropped
    setResult("loading");
    void sendMessage<unknown>({ type: "EXPLAIN_SELECTION", text }).then((raw) => {
      if (!current) return;
      const parsed = ExplainSelectionResponseSchema.safeParse(raw);
      setResult(parsed.success ? parsed.data : { ok: false, reason: "failed" });
    });
    return () => {
      current = false;
    };
  }, [text, attempt]);

  if (result === "loading") {
    return (
      <p className="side-note" role="status">
        {t("sideExplaining")}
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
  return <Explanation explanation={result.explanation} />;
}

function Explanation({ explanation }: { explanation: ExplainResponse }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [addFailed, setAddFailed] = useState(false);
  const segments = explainSegments(explanation.germanText, explanation.tokens);
  const token = picked === null ? undefined : explanation.tokens[picked];

  const add = async (lemma: string, russian: string) => {
    setAddFailed(false);
    const raw = await sendMessage<unknown>({ type: "ADD_TO_VOCABULARY", lemma, russian }).catch(
      () => null,
    );
    if (AddToVocabularyResponseSchema.safeParse(raw).success) {
      setAdded((prev) => new Set(prev).add(lemma));
    } else {
      setAddFailed(true);
    }
  };

  return (
    <>
      <div className="card side-result">
        <div className="card-kicker">{t("sideExplainTranslation")}</div>
        <p className="side-text">{explanation.translationRu}</p>
      </div>

      <div className="card side-result">
        <div className="card-kicker">{t("sideExplainGerman")}</div>
        <p className="side-text side-german" lang="de">
          {segments.map((segment, i) =>
            segment.token === undefined ? (
              <span key={i}>{segment.text}</span>
            ) : (
              <button
                key={i}
                type="button"
                className="sp-word sp-token"
                aria-pressed={picked === segment.token}
                onClick={() => setPicked(segment.token ?? null)}
              >
                {segment.text}
              </button>
            ),
          )}
        </p>
        {token ? (
          <div className="side-gloss side-token" role="status">
            <div>
              <strong lang="de">{token.lemma}</strong>
              <span className="side-gloss-sep" aria-hidden="true" />
              <span>{token.glossRu}</span>
            </div>
            <div className="side-note">
              {[t(POS_LABEL[token.pos]), token.morph].filter(Boolean).join(", ")}
            </div>
            {added.has(token.lemma) ? (
              <span className="tag tag-neutral">{t("sideAddedToVocab")}</span>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void add(token.lemma, token.glossRu)}
              >
                {t("sideAddToVocab")}
              </button>
            )}
            {addFailed && <span className="side-note">{t("noticeFailed")}</span>}
          </div>
        ) : (
          <p className="side-note">{t("sideTapWord")}</p>
        )}
      </div>

      {explanation.grammar.length > 0 && (
        <div className="card side-result">
          <div className="card-kicker">{t("sideExplainGrammar")}</div>
          {explanation.grammar.map((item) => (
            <section key={item.id} className="side-grammar">
              <h2 className="side-grammar-title">{item.titleRu}</h2>
              <p className="side-text">{item.explanationRu}</p>
              <p className="side-note">
                {t("sideExplainExample")}{" "}
                <span lang="de">
                  {item.surfaceSpans
                    .map((s) => explanation.germanText.slice(s.start, s.end))
                    .join(" … ")}
                </span>
              </p>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
