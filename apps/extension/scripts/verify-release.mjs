// Checks the release zip itself, the file that goes into the GitHub Release and to the store,
// with the same rules as `pnpm build:release` (verifyBundle) after unpacking it.
//
//   WXT_CMS_BASE_URL=https://… EXPECTED_VERSION=1.2.3 \
//     node scripts/verify-release.mjs <zip> [--report <file.json>]
//
// The report carries what the release notes need from the package: version, sha256, permissions,
// hosts and the store summary (manifest description) per locale. Exits 1 on any problem.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { parseArgs } from "node:util";
import { verifyBundle } from "./build-store-zip.mjs";

const {
  values: { report: reportPath },
  positionals: [zip],
} = parseArgs({ options: { report: { type: "string" } }, allowPositionals: true });
const cmsBaseUrl = process.env.WXT_CMS_BASE_URL ?? "";
const expectedVersion = process.env.EXPECTED_VERSION ?? "";

const fail = (lines) => {
  console.error(`\nRelease package rejected:\n- ${lines.join("\n- ")}`);
  process.exit(1);
};

const usage = [];
if (!zip || !existsSync(zip)) usage.push(`zip not found: ${zip ?? "(no path given)"}`);
if (!cmsBaseUrl) usage.push("WXT_CMS_BASE_URL is not set");
if (!expectedVersion) usage.push("EXPECTED_VERSION is not set");
if (usage.length) fail(usage);

const problems = [];
const expectedName = `sprachweise-v${expectedVersion}-chrome.zip`;
if (basename(zip) !== expectedName)
  problems.push(`zip is named ${basename(zip)}, not ${expectedName}`);

// Unpacks into a temp dir and returns what the report needs; problems go into `problems`.
function inspect(dir) {
  execFileSync("unzip", ["-q", zip, "-d", dir], { stdio: "inherit" });
  if (!existsSync(join(dir, "manifest.json"))) {
    problems.push("manifest.json is not at the zip root");
    return undefined;
  }
  const {
    problems: bundleProblems,
    summary,
    manifest,
  } = verifyBundle(dir, {
    cmsBaseUrl,
    expectedVersion,
  });
  problems.push(...bundleProblems);

  // The store shows the manifest description as the listing summary, per locale.
  const summaries = {};
  for (const locale of readdirSync(join(dir, "_locales")).sort()) {
    const messages = JSON.parse(
      readFileSync(join(dir, "_locales", locale, "messages.json"), "utf8"),
    );
    summaries[locale] = messages.extDescription?.message ?? "";
  }
  return { manifest, summary, summaries };
}

const dir = mkdtempSync(join(tmpdir(), "sprachweise-release-"));
let inspected;
try {
  inspected = inspect(dir);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

const sha256 = createHash("sha256").update(readFileSync(zip)).digest("hex");
if (inspected) console.log(`\n${inspected.summary.join("\n")}`);
console.log(`sha256 ${sha256}`);
if (problems.length) fail(problems);

const { manifest, summary, summaries } = inspected;
if (reportPath) {
  const report = {
    zip: basename(zip),
    sha256,
    version: manifest.version,
    defaultLocale: manifest.default_locale ?? null,
    permissions: manifest.permissions ?? [],
    hostPermissions: manifest.host_permissions ?? [],
    optionalPermissions: manifest.optional_permissions ?? [],
    optionalHostPermissions: manifest.optional_host_permissions ?? [],
    summaries,
    checks: summary,
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}
console.log(`\nRelease package OK: ${basename(zip)}`);
