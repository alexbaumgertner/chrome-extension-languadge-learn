import { createLoopbackServer, withCors } from "../tests/integration/loopback-server";
import { generateExercises } from "../../cms/src/exercises/generate";
import { markVocab } from "../../cms/src/pipeline/mark-vocab";

/** The article the screenshots show; the first paragraph has a hand-checked A1–A2 rewrite. */
export const ARTICLE = {
  title: "Выходные в Берлине",
  paragraphs: [
    "В выходные мы решили поехать в Берлин. Утром мы гуляли по парку Тиргартен, а потом пили кофе в маленьком кафе у вокзала. Вечером мы поднялись на телебашню: оттуда виден весь город.",
    "Берлин оказался намного спокойнее, чем мы думали. Люди никуда не спешат, в парках много велосипедистов, а в булочных с утра стоят очереди за свежими брецелями.",
    "В воскресенье мы съездили на озеро Ванзее. Вода была ещё холодной, но на берегу уже загорали первые смельчаки, а в пивном саду играла музыка.",
  ],
};

const GERMAN =
  "Am Wochenende sind wir nach Berlin gefahren. Am Morgen sind wir durch den Tiergarten " +
  "spaziert. Danach haben wir in einem kleinen Café am Bahnhof Kaffee getrunken. Am Abend sind " +
  "wir auf den Fernsehturm gefahren. Von dort sieht man die ganze Stadt.";

const GLOSSES = [
  { german: "Wochenende", lemma: "das Wochenende", russian: "выходные" },
  { german: "spaziert", lemma: "spazieren", russian: "гулять" },
  { german: "Bahnhof", lemma: "der Bahnhof", russian: "вокзал" },
  { german: "getrunken", lemma: "trinken", russian: "пить" },
  { german: "Fernsehturm", lemma: "der Fernsehturm", russian: "телебашня" },
  { german: "Stadt", lemma: "die Stadt", russian: "город" },
];

/** The extension's backend for screenshots: real exercise generator, canned translation. */
export function createStoreMockBackend() {
  return createLoopbackServer(
    withCors((req, res) => {
      let body = "";
      req.on("data", (chunk: Buffer) => (body += chunk.toString()));
      req.on("end", () => {
        res.setHeader("Content-Type", "application/json");
        if (req.url === "/api/translate") {
          res.end(
            JSON.stringify({
              text: GERMAN,
              markedVocab: markVocab(GERMAN, GLOSSES),
              cache: "miss",
              model: "gemini-3.8-flash",
              promptVersion: "2",
            }),
          );
          return;
        }
        if (req.url === "/api/exercises") {
          const { variantText, markedVocab } = JSON.parse(body);
          res.end(JSON.stringify({ exercises: generateExercises(variantText, markedVocab) }));
          return;
        }
        res.statusCode = 204; // /api/events, /api/report
        res.end();
      });
    }),
  );
}
