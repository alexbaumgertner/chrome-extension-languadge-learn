// Builds the Chrome Web Store package: a production build zipped by `wxt zip`, then checked so a
// test or dev build can never be uploaded. Run from the repo root with `pnpm store:zip`.
//
// `--release` (`pnpm build:release`) is the same build for a tagged release: the API comes from
// WXT_CMS_BASE_URL (required, https://) instead of the production default, and the manifest version
// must equal EXPECTED_VERSION (required).
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const PRODUCTION_API = "https://sprachweise.vercel.app";
const EXPECTED_PERMISSIONS = ["activeTab", "contextMenus", "scripting", "storage"];
// Only test builds contain these: local hosts (mock API, fixture page) and the test hooks.
const TEST_ONLY = /localhost|127\.0\.0\.1|:58733|sprachweiseTest/;
const BINARY = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|zip)$/i;
// CSP sources that grant no network host.
const CSP_KEYWORD = /^('[^']*'|data:|blob:)$/;

const files = (dir) =>
  readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));

// Host of an https:// URL, CSP source or match pattern; undefined for anything else (http, *://,
// bare hosts, wildcards), so those never count as expected.
const httpsHost = (source) => {
  const match = /^https:\/\/([^/:*]+(?::\d+)?)(\/.*)?$/.exec(source);
  return match?.[1];
};

/**
 * Checks an unpacked build (`.output/chrome-mv3`). Pure: reads `dir`, returns the problems found and
 * a summary; the caller decides how to report and exit.
 */
export function verifyBundle(dir, { cmsBaseUrl, expectedVersion }) {
  const problems = [];
  const check = (ok, message) => ok || problems.push(message);
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  const cmsHost = httpsHost(cmsBaseUrl);
  check(cmsHost, `API base URL is not https: ${cmsBaseUrl}`);

  // Constitution I: no default host access, so no host is expected in host_permissions.
  const hostPermissions = manifest.host_permissions ?? [];
  for (const pattern of hostPermissions) check(false, `unexpected host_permissions: ${pattern}`);

  // The API is the only host extension pages may name in CSP.
  const csp = manifest.content_security_policy ?? {};
  const cspText = typeof csp === "string" ? csp : Object.values(csp).join("; ");
  for (const directive of cspText.split(";")) {
    for (const source of directive.trim().split(/\s+/).slice(1)) {
      if (CSP_KEYWORD.test(source)) continue;
      check(cmsHost && httpsHost(source) === cmsHost, `unexpected CSP source: ${source}`);
    }
  }

  check(!manifest.content_scripts?.length, "manifest declares content scripts");
  check(
    JSON.stringify([...(manifest.permissions ?? [])].sort()) ===
      JSON.stringify(EXPECTED_PERMISSIONS),
    `unexpected permissions: ${manifest.permissions}`,
  );
  check(
    !manifest.optional_host_permissions,
    `optional_host_permissions present: ${manifest.optional_host_permissions}`,
  );
  check(manifest.commands?.["translate-selection"], "no translate-selection keyboard command");
  check(manifest.icons?.["128"], "no 128px icon");
  check(manifest.version !== "0.0.0", "version is 0.0.0");
  if (expectedVersion !== undefined) {
    check(
      manifest.version === expectedVersion,
      `manifest version ${manifest.version} != EXPECTED_VERSION ${expectedVersion}`,
    );
  }
  for (const locale of readdirSync(join(dir, "_locales"))) {
    const messages = JSON.parse(
      readFileSync(join(dir, "_locales", locale, "messages.json"), "utf8"),
    );
    const length = [...messages.extDescription.message].length;
    check(length <= 132, `${locale} description is ${length} characters (store limit 132)`);
  }

  // Manifest and bundle alike: any of these means a test or dev build.
  const scanned = files(dir).filter((file) => !BINARY.test(file));
  for (const file of scanned) {
    const hit = TEST_ONLY.exec(readFileSync(file, "utf8"));
    if (hit) check(false, `${relative(dir, file)} contains ${hit[0]}`);
  }

  const background = readFileSync(join(dir, "background.js"), "utf8");
  check(background.includes(cmsBaseUrl), `background does not call ${cmsBaseUrl}`);

  const summary = [
    `version ${manifest.version}${expectedVersion === undefined ? "" : ` (expected ${expectedVersion})`}`,
    `API ${cmsBaseUrl}`,
    `permissions ${manifest.permissions?.join(", ")}`,
    `host_permissions ${hostPermissions.join(", ") || "none"}`,
    `CSP ${cspText || "default"}`,
    `scanned ${scanned.length} files for localhost/127.0.0.1/:58733/sprachweiseTest`,
  ];
  return { problems, summary, manifest };
}

function main() {
  const release = process.argv.includes("--release");
  const root = new URL("..", import.meta.url).pathname;
  const out = join(root, ".output");
  const fail = (lines) => {
    console.error(`\nStore package rejected:\n- ${lines.join("\n- ")}`);
    process.exit(1);
  };

  // Test/dev overrides must not leak into the store build (they add a host permission or point the
  // API elsewhere). A release keeps WXT_CMS_BASE_URL, but only an https one.
  const env = { ...process.env };
  for (const key of ["WXT_TEST_MODE", "WXT_TEST_ORIGIN", "WXT_CMS_BASE_URL"]) delete env[key];
  let cmsBaseUrl = PRODUCTION_API;
  let expectedVersion = process.env.EXPECTED_VERSION || undefined;
  if (release) {
    cmsBaseUrl = process.env.WXT_CMS_BASE_URL ?? "";
    const envProblems = [];
    if (!httpsHost(cmsBaseUrl) || cmsBaseUrl.endsWith("/")) {
      envProblems.push(
        `WXT_CMS_BASE_URL must be an https:// URL without a trailing slash, got "${cmsBaseUrl}"`,
      );
    }
    if (!expectedVersion) envProblems.push("EXPECTED_VERSION is not set");
    if (envProblems.length) fail(envProblems);
    env.WXT_CMS_BASE_URL = cmsBaseUrl;
  }

  execFileSync("pnpm", ["exec", "wxt", "zip"], { cwd: root, env, stdio: "inherit" });

  const { problems, summary, manifest } = verifyBundle(join(out, "chrome-mv3"), {
    cmsBaseUrl,
    expectedVersion,
  });
  console.log(`\n${summary.join("\n")}`);
  if (problems.length) fail(problems);

  const zip = readdirSync(out).find((f) => f.endsWith(`-${manifest.version}-chrome.zip`));
  const sha256 = createHash("sha256")
    .update(readFileSync(join(out, zip)))
    .digest("hex");
  console.log(`\nStore package OK: apps/extension/.output/${zip}`);
  console.log(`sha256 ${sha256}`);
}

if (process.argv[1] === import.meta.filename) main();
