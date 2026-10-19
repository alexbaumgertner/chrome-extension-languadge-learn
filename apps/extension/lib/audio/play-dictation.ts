const RATES = { normal: 0.95, slow: 0.6 } as const;

/** `getVoices()` is empty until Chrome has loaded them; wait briefly for `voiceschanged`. */
function loadVoices(synth: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
  const voices = synth.getVoices();
  if (voices.length > 0) return Promise.resolve(voices);
  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener("voiceschanged", done);
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", done);
    setTimeout(done, 1000);
  });
}

/**
 * Prefers Chrome's network "Google Deutsch" voice (the most natural one available without a
 * server), then any de-DE voice, then any German voice. Undefined lets the browser pick from
 * `utterance.lang`.
 */
export function pickGermanVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const german = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith("de"));
  return (
    german.find((v) => /google/i.test(v.name) && v.lang.replace("_", "-") === "de-DE") ??
    german.find((v) => v.lang.replace("_", "-") === "de-DE") ??
    german[0]
  );
}

/**
 * Speaks a dictation sentence with the browser's own speech synthesis — no server TTS. Resolves
 * when speech ends (or fails), so callers can disable the play buttons meanwhile. Degrades
 * silently on devices without synthesis.
 */
export async function playDictationAudio(sentence: string, rate: "normal" | "slow"): Promise<void> {
  const synth = window.speechSynthesis;
  if (!synth) return;
  const voice = pickGermanVoice(await loadVoices(synth));

  await new Promise<void>((resolve) => {
    try {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = "de-DE";
      if (voice) utterance.voice = voice;
      utterance.rate = RATES[rate];
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      synth.speak(utterance);
    } catch {
      resolve();
    }
  });
}
