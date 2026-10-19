import { useState } from "react";
import type { ReportBadTranslationResponse } from "@sprachweise/shared";
import { sendMessage } from "@/lib/messaging/send";

type State = "idle" | "sending" | "sent" | "failed";

/**
 * "Плохой перевод" for the paragraph this panel belongs to. Nothing is sent until the click
 * (constitution III); the parent keys this by variant, so a new paragraph starts from idle.
 */
export default function ReportBadTranslation({
  variantId,
  sourceText,
}: {
  variantId: string;
  sourceText: string;
}) {
  const [state, setState] = useState<State>("idle");

  async function report(): Promise<void> {
    setState("sending");
    const res = await sendMessage<ReportBadTranslationResponse>({
      type: "REPORT_BAD_TRANSLATION",
      variantId,
      sourceText,
    }).catch(() => ({ ok: false }));
    setState(res.ok ? "sent" : "failed");
  }

  if (state === "sent") {
    return <div className="sw-report sw-feedback-ok">Спасибо! Отправили на проверку.</div>;
  }
  return (
    <div className="sw-report">
      <button
        className="sw-report-btn"
        disabled={state === "sending"}
        title="Отправит этот абзац и его немецкий перевод на проверку"
        onClick={() => void report()}
      >
        {state === "failed" ? "Повторить" : "Плохой перевод"}
      </button>
      {state === "failed" && (
        <span className="sw-feedback">Не удалось отправить, попробуйте ещё раз.</span>
      )}
    </div>
  );
}
