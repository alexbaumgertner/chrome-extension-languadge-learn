import type { Level, PlayTtsResponse } from "@sprachweise/shared";
import { sendMessage } from "@/lib/messaging/send";

function fallbackSpeak(sentence: string, rate: "normal" | "slow"): void {
  try {
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = "de-DE";
    utterance.rate = rate === "slow" ? 0.6 : 0.95;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Synthesis unavailable on this device — degrade silently (research.md §8).
  }
}

/**
 * Plays a dictation sentence via the CMS-backed (cached) TTS audio when
 * available, falling back to the browser's native SpeechSynthesis — which
 * works fully offline — on any fetch failure or missing cache entry.
 */
export async function playDictationAudio(
  sentence: string,
  rate: "normal" | "slow",
  contentHash: string,
  level: Level,
  topic: string,
): Promise<void> {
  const response = await sendMessage<PlayTtsResponse>({
    type: "PLAY_TTS",
    sentence,
    rate,
    contentHash,
    level,
    topic,
  });

  if (!response.ok) {
    fallbackSpeak(sentence, rate);
    return;
  }

  try {
    const audio = new Audio(response.audioDataUrl);
    await audio.play();
  } catch {
    fallbackSpeak(sentence, rate);
  }
}
