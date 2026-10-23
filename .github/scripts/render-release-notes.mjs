// Renders the GitHub Release body from store/release-notes.md.tmpl: the changelog, the package
// facts from verify-release.mjs, the dashboard fields from store/*, and the pre-release checklist
// the workflow's steps wrote.
//
//   node .github/scripts/render-release-notes.mjs --tag v1.2.3 --commit <sha> \
//     --previous-tag v1.2.2 --changelog changelog.md --verify-report verify.json \
//     --checklist checklist.tsv --cms-base-url https://… --item-id <id> --out notes.md
//
// Dashboard texts come from these files in --store-dir (default: store). A missing one renders as
// a loud PLACEHOLDER and a warning in the checklist; it does not fail the release.
//   description.txt                         Store listing → Description
//   permissions.json                        {"<permission or host pattern>": "<justification>"}
//     (or permissions.md, pasted as is)
//   test-instructions.txt (or .md)          Test instructions → Additional instructions
//
// The checklist file has one "pass|warn|fail<TAB>check<TAB>detail" line per check.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";

const SUMMARY_LIMIT = 132;
const DESCRIPTION_LIMIT = 16000;

const { values: opts } = parseArgs({
  options: {
    template: { type: "string", default: "store/release-notes.md.tmpl" },
    "store-dir": { type: "string", default: "store" },
    out: { type: "string" },
    tag: { type: "string" },
    commit: { type: "string" },
    "previous-tag": { type: "string", default: "" },
    changelog: { type: "string" },
    "verify-report": { type: "string" },
    checklist: { type: "string" },
    "cms-base-url": { type: "string" },
    "item-id": { type: "string" },
  },
});
const missing = [
  "out",
  "tag",
  "commit",
  "changelog",
  "verify-report",
  "checklist",
  "cms-base-url",
  "item-id",
].filter((name) => !opts[name]);
if (missing.length) {
  console.error(`Missing options: ${missing.map((name) => `--${name}`).join(", ")}`);
  process.exit(1);
}

const report = JSON.parse(readFileSync(opts["verify-report"], "utf8"));
const length = (text) => [...text].length;
const storePath = (name) => join(opts["store-dir"], name);

/** The first of `names` that exists in the store dir, with its text; undefined if none does. */
function readStore(...names) {
  for (const name of names) {
    if (existsSync(storePath(name))) {
      return { name, text: readFileSync(storePath(name), "utf8").replace(/\s+$/, "") };
    }
  }
  return undefined;
}

/** A fenced block the text can't break out of, for copying into the dashboard verbatim. */
function fenced(text, lang = "text") {
  const longest = Math.max(2, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(longest + 1);
  return `${fence}${lang}\n${text}\n${fence}`;
}

const missingFiles = [];
function placeholder(file, what) {
  missingFiles.push(file);
  return [
    "> [!WARNING]",
    `> **PLACEHOLDER — \`${file}\` was not in the repository when this release was built.**`,
    `> Write the ${what} in the dashboard by hand, or add the file and re-run the release workflow.`,
  ].join("\n");
}

function renderSummary() {
  const locales = Object.keys(report.summaries);
  return locales
    .map((locale) => {
      const text = report.summaries[locale];
      const n = length(text);
      const verdict = n <= SUMMARY_LIMIT ? "within the limit" : "**over the limit**";
      const isDefault = locale === report.defaultLocale ? ", default locale" : "";
      return `**${locale}**${isDefault}: ${n} / ${SUMMARY_LIMIT} characters, ${verdict}\n\n${fenced(text)}`;
    })
    .join("\n\n");
}

function renderDescription() {
  const file = readStore("description.txt");
  if (!file) return placeholder("store/description.txt", "detailed description");
  const n = length(file.text);
  const verdict = n <= DESCRIPTION_LIMIT ? "within the limit" : "**over the limit**";
  return `${n.toLocaleString("en-US")} / 16,000 characters, ${verdict}\n\n${fenced(file.text)}`;
}

function renderPermissions() {
  const requested = [
    ...report.permissions.map((name) => ({ name, kind: "permission" })),
    ...report.optionalPermissions.map((name) => ({ name, kind: "optional permission" })),
    ...report.hostPermissions.map((name) => ({ name, kind: "host" })),
    ...report.optionalHostPermissions.map((name) => ({ name, kind: "optional host" })),
  ];
  const hostsNote =
    report.hostPermissions.length + report.optionalHostPermissions.length === 0
      ? "Host permissions: **none**. The manifest requests no host access (no `host_permissions`, " +
        "no `optional_host_permissions`, no content scripts), so there is no host to justify."
      : "";

  const json = readStore("permissions.json");
  if (!json) {
    const markdown = readStore("permissions.md");
    if (markdown) {
      const list = requested.map(({ name, kind }) => `\`${name}\` (${kind})`).join(", ");
      return [`Requested by the manifest: ${list}.`, hostsNote, markdown.text]
        .filter(Boolean)
        .join("\n\n");
    }
    const warning = placeholder("store/permissions.json", "justification for each permission");
    const rows = requested.map(
      ({ name, kind }) => `| \`${name}\` | ${kind} | **PLACEHOLDER: justification missing** |`,
    );
    return [warning, table(rows), hostsNote].filter(Boolean).join("\n\n");
  }

  const justifications = JSON.parse(json.text);
  const rows = requested.map(({ name, kind }) => {
    const text = justifications[name];
    if (!text) missingFiles.push(`${json.name}: "${name}"`);
    return `| \`${name}\` | ${kind} | ${text ? cell(text) : `**PLACEHOLDER: add "${name}" to \`store/${json.name}\`**`} |`;
  });
  const requestedNames = new Set(requested.map(({ name }) => name));
  const unused = Object.keys(justifications).filter((name) => !requestedNames.has(name));
  const unusedNote = unused.length
    ? `Not requested by this manifest, so not needed in the form: ${unused.map((name) => `\`${name}\``).join(", ")}.`
    : "";
  return [table(rows), hostsNote, unusedNote].filter(Boolean).join("\n\n");
}

const cell = (text) => text.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");
const table = (rows) =>
  ["| Permission | Kind | Justification |", "| --- | --- | --- |", ...rows].join("\n");

function renderTestInstructions() {
  const file = readStore("test-instructions.txt", "test-instructions.md");
  if (!file)
    return placeholder("store/test-instructions.txt", "test instructions for the reviewer");
  return fenced(file.text);
}

function renderChecklist() {
  const lines = readFileSync(opts.checklist, "utf8").split("\n").filter(Boolean);
  if (missingFiles.length) {
    lines.push(`warn\tStore texts present in store/\tmissing: ${missingFiles.join(", ")}`);
  } else {
    lines.push("pass\tStore texts present in store/\tdescription, permissions, test instructions");
  }
  const marks = { pass: "- [x]", warn: "- [ ] ⚠️", fail: "- [ ] ❌" };
  return lines
    .map((line) => {
      const [status, check, detail] = line.split("\t");
      const mark = marks[status] ?? marks.fail;
      return `${mark} ${check}${detail ? ` — ${detail}` : ""}`;
    })
    .join("\n");
}

function renderChangelog() {
  const text = readFileSync(opts.changelog, "utf8").trim();
  return text || "_No commits._";
}

// Sections first, so their missing files reach the checklist.
const values = {
  version: report.version,
  tag: opts.tag,
  commit: opts.commit,
  previous_tag: opts["previous-tag"] ? `\`${opts["previous-tag"]}\`` : "the start (first release)",
  changelog: renderChangelog(),
  zip_name: report.zip,
  sha256: report.sha256,
  item_id: opts["item-id"],
  cms_base_url: opts["cms-base-url"],
  privacy_url: `${opts["cms-base-url"]}/privacy`,
  summary: renderSummary(),
  description: renderDescription(),
  permissions: renderPermissions(),
  test_instructions: renderTestInstructions(),
};
values.checklist = renderChecklist();

const template = readFileSync(opts.template, "utf8");
const unknown = new Set();
const body = template.replace(/\{\{(\w+)\}\}/g, (match, name) => {
  if (!(name in values)) unknown.add(name);
  return values[name] ?? match;
});
if (unknown.size) {
  console.error(`Unknown placeholders in ${opts.template}: ${[...unknown].join(", ")}`);
  process.exit(1);
}
writeFileSync(opts.out, body);
console.log(`Release notes written to ${opts.out} (${length(body)} characters).`);
if (missingFiles.length) {
  console.log(`::warning::Release notes use placeholders for: ${missingFiles.join(", ")}`);
}
