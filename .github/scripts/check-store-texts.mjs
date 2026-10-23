// Fails when the Chrome Web Store texts in store/ disagree with each other or with the code.
// Run after `pnpm build` (it reads the built manifest):  node .github/scripts/check-store-texts.mjs
//
//   - summary.txt equals the English manifest summary and every summary fits 132 characters
//   - descriptions fit 16,000 characters
//   - permissions.json and permission-justifications.md cover exactly the manifest's permissions
//     and hosts
//   - test-instructions.md carries the text of test-instructions.txt
//   - the selection cap in TRANSLATE_MAX_CHARS appears, spelled the same, in the texts and in the
//     privacy policy
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const problems = [];
const fail = (message) => problems.push(message);
const read = (path) => readFileSync(path, "utf8");
const chars = (text) => [...text].length;

const required = [
  "description.txt",
  "description.en.txt",
  "summary.txt",
  "single-purpose.txt",
  "permissions.json",
  "permission-justifications.md",
  "remote-code.md",
  "data-usage.md",
  "test-instructions.txt",
  "test-instructions.md",
];
for (const name of required) if (!existsSync(`store/${name}`)) fail(`store/${name} is missing`);
if (problems.length) finish();

// Summary: the dashboard shows the manifest's text, so summary.txt must be the same string.
const locales = ["en", "ru"];
const summaries = Object.fromEntries(
  locales.map((l) => [
    l,
    JSON.parse(read(`apps/extension/public/_locales/${l}/messages.json`)).extDescription.message,
  ]),
);
for (const [locale, text] of Object.entries(summaries)) {
  if (chars(text) > 132)
    fail(`${locale} manifest summary is ${chars(text)} characters (limit 132)`);
}
if (read("store/summary.txt").trim() !== summaries.en) {
  fail("store/summary.txt differs from extDescription in _locales/en/messages.json");
}

for (const name of ["description.txt", "description.en.txt"]) {
  const n = chars(read(`store/${name}`));
  if (n > 16000) fail(`store/${name} is ${n} characters (limit 16,000)`);
}

// Permissions: the built production manifest is the truth.
const manifestPath = "apps/extension/.output/chrome-mv3/manifest.json";
if (!existsSync(manifestPath)) {
  fail(`${manifestPath} not found: run \`pnpm build\` first`);
} else {
  const manifest = JSON.parse(read(manifestPath));
  const requested = [
    ...(manifest.permissions ?? []),
    ...(manifest.optional_permissions ?? []),
    ...(manifest.host_permissions ?? []),
    ...(manifest.optional_host_permissions ?? []),
  ].sort();
  const documented = Object.keys(JSON.parse(read("store/permissions.json"))).sort();
  if (requested.join() !== documented.join()) {
    fail(`store/permissions.json covers [${documented}] but the manifest requests [${requested}]`);
  }
  const readable = read("store/permission-justifications.md");
  for (const name of requested) {
    if (!readable.includes(`## \`${name}\``)) {
      fail(`store/permission-justifications.md has no "## \`${name}\`" section`);
    }
  }
  const sections = [...readable.matchAll(/^## `([^`]+)`$/gm)].map((m) => m[1]);
  for (const name of sections) {
    if (!requested.includes(name))
      fail(
        `store/permission-justifications.md justifies "${name}", which the manifest does not request`,
      );
  }
  if ((manifest.content_scripts ?? []).length > 0 && !/content[- ]script/i.test(readable)) {
    fail(
      "the manifest declares content scripts but permission-justifications.md never mentions them",
    );
  }
}

// The same instructions in both formats.
const instructions = read("store/test-instructions.txt").trim();
if (!read("store/test-instructions.md").includes(instructions)) {
  fail("store/test-instructions.md does not contain the text of store/test-instructions.txt");
}

// The selection cap, spelled the way each text spells it.
const cap = Number(
  /TRANSLATE_MAX_CHARS\s*=\s*(\d+)/.exec(read("packages/shared/src/schemas/cms.ts"))?.[1],
);
if (!cap) {
  fail("could not read TRANSLATE_MAX_CHARS from packages/shared/src/schemas/cms.ts");
} else {
  const comma = cap.toLocaleString("en-US");
  const plain = String(cap);
  const expectations = [
    ["store/description.en.txt", comma],
    ["store/description.txt", plain],
    ["store/data-usage.md", comma],
    ["store/test-instructions.txt", comma],
    ["apps/cms/src/privacy/policy.ts", comma],
    ["apps/cms/src/privacy/policy.ts", plain],
    ["README.md", comma],
  ];
  for (const [file, spelled] of expectations) {
    if (!read(file).includes(spelled))
      fail(`${file} does not mention the ${spelled}-character cap`);
  }
}

finish();

function finish() {
  if (problems.length) {
    console.error(`Store texts are inconsistent:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    process.exit(1);
  }
  console.log("Store texts are consistent.");
}
