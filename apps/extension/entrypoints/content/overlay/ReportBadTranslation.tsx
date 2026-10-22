import { useState } from "react";
import type { ReportBadTranslationResponse } from "@sprachweise/shared";
import { sendMessage } from "@/lib/messaging/send";
import { t } from "@/lib/i18n";

type State = "idle" | "sending" | "sent" | "failed";

/**
 * "Bad translation" (reportButton) for the paragraph this panel belongs to. Nothing is sent until the click
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
    return <div className="sw-report sw-feedback-ok">{t("reportSent")}</div>;
  }
  return (
    <div className="sw-report">
      <button
        className="sw-report-btn btn btn-secondary"
        disabled={state === "sending"}
        title={t("reportTitle")}
        onClick={() => void report()}
      >
        {state === "failed" ? t("reportRetry") : t("reportButton")}
      </button>
      {state === "failed" && <span className="sw-feedback">{t("reportFailed")}</span>}
    </div>
  );
}
