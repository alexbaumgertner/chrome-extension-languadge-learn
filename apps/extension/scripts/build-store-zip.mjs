// Builds the Chrome Web Store package: a production build zipped by `wxt zip`, then checked so a
// test or dev build can never be uploaded. Run from the repo root with `pnpm store:zip`.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PRODUCTION_API = "https://sprachweise.vercel.app";
const EXPECTED_PERMISSIONS = ["activeTab", "scripting", "storage"];
const root = new URL("..", import.meta.url).pathname;
const out = join(root, ".output");

// Test/dev overrides must not leak into the store build (they add a host permission or point the
// API elsewhere).
const env = { ...process.env };
for (const key of ["WXT_TEST_MODE", "WXT_TEST_ORIGIN", "WXT_CMS_BASE_URL"]) delete env[key];
execFileSync("pnpm", ["exec", "wxt", "zip"], { cwd: root, env, stdio: "inherit" });

const problems = [];
const manifest = JSON.parse(readFileSync(join(out, "chrome-mv3/manifest.json"), "utf8"));
const check = (ok, message) => ok || problems.push(message);

check(!manifest.host_permissions, `host_permissions present: ${manifest.host_permissions}`);
check(!manifest.content_scripts?.length, "manifest declares content scripts");
check(
  JSON.stringify([...manifest.permissions].sort()) === JSON.stringify(EXPECTED_PERMISSIONS),
  `unexpected permissions: ${manifest.permissions}`,
);
check(
  JSON.stringify(manifest.optional_host_permissions) === JSON.stringify(["*://*/*"]),
  "optional_host_permissions changed",
);
check(manifest.icons?.["128"], "no 128px icon");
check(manifest.version !== "0.0.0", "version is 0.0.0");
for (const locale of readdirSync(join(out, "chrome-mv3/_locales"))) {
  const messages = JSON.parse(
    readFileSync(join(out, "chrome-mv3/_locales", locale, "messages.json"), "utf8"),
  );
  const length = [...messages.extDescription.message].length;
  check(length <= 132, `${locale} description is ${length} characters (store limit 132)`);
}

const background = readFileSync(join(out, "chrome-mv3/background.js"), "utf8");
check(background.includes(PRODUCTION_API), `background does not call ${PRODUCTION_API}`);
check(!/127\.0\.0\.1|localhost:8787/.test(background), "background points at a local API");

if (problems.length) {
  console.error(`\nStore package rejected:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

const zip = readdirSync(out).find((f) => f.endsWith(`-${manifest.version}-chrome.zip`));
const sha256 = createHash("sha256")
  .update(readFileSync(join(out, zip)))
  .digest("hex");
console.log(`\nStore package OK: apps/extension/.output/${zip}`);
console.log(`version ${manifest.version}, permissions ${manifest.permissions.join(", ")}`);
console.log(`sha256 ${sha256}`);
