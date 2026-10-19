import { describe, expect, it } from "vitest";
import { pickGermanVoice } from "@/lib/audio/play-dictation";

function voice(name: string, lang: string): SpeechSynthesisVoice {
  return { name, lang, default: false, localService: true, voiceURI: name };
}

describe("pickGermanVoice", () => {
  it("prefers the Google de-DE voice", () => {
    const picked = pickGermanVoice([
      voice("Anna", "de-DE"),
      voice("Google US English", "en-US"),
      voice("Google Deutsch", "de-DE"),
    ]);
    expect(picked?.name).toBe("Google Deutsch");
  });

  it("falls back to any de-DE voice, then any German voice", () => {
    expect(pickGermanVoice([voice("Anna", "de-DE"), voice("Lukas", "de-AT")])?.name).toBe("Anna");
    expect(pickGermanVoice([voice("Lukas", "de_AT")])?.name).toBe("Lukas");
  });

  it("returns undefined without a German voice", () => {
    expect(pickGermanVoice([voice("Samantha", "en-US")])).toBeUndefined();
  });
});
