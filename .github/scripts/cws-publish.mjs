// Uploads the release zip to the Chrome Web Store (API v2), waits for the upload to be processed,
// then submits it for review. Listing fields are not touched: the API can't edit them.
//
//   CWS_CLIENT_ID=… CWS_CLIENT_SECRET=… CWS_REFRESH_TOKEN=… CWS_PUBLISHER_ID=… CWS_ITEM_ID=… \
//     EXPECTED_VERSION=1.2.3 node .github/scripts/cws-publish.mjs <zip>
//
// Never prints a credential: the access token is masked in the Actions log as soon as it exists,
// and error output shows only HTTP status and the API's error message.
import { appendFileSync, readFileSync } from "node:fs";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";

const API = "https://chromewebstore.googleapis.com";
const POLL_INTERVAL_MS = 10_000;
const POLL_TIMEOUT_MS = 10 * 60_000;

const env = (name) => {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is not set`);
    process.exit(1);
  }
  return value;
};
const zip = process.argv[2];
if (!zip) {
  console.error("Usage: cws-publish.mjs <zip>");
  process.exit(1);
}
const expectedVersion = env("EXPECTED_VERSION");
const publisherId = env("CWS_PUBLISHER_ID");
const itemId = env("CWS_ITEM_ID");
const item = `publishers/${encodeURIComponent(publisherId)}/items/${encodeURIComponent(itemId)}`;

const fail = (message) => {
  console.error(`::error::${message}`);
  process.exit(1);
};
const summary = (line) => {
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
};

/** The API's own error message, never the request. */
async function errorText(res) {
  const text = await res.text();
  try {
    const { error } = JSON.parse(text);
    const parts = typeof error === "string" ? [error] : [error?.status, error?.message];
    return [res.status, ...parts].filter(Boolean).join(" ");
  } catch {
    return `${res.status} ${text.slice(0, 300)}`;
  }
}

async function accessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("CWS_CLIENT_ID"),
      client_secret: env("CWS_CLIENT_SECRET"),
      refresh_token: env("CWS_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) fail(`OAuth token exchange failed: ${await errorText(res)}`);
  const { access_token: token } = await res.json();
  if (!token) fail("OAuth token exchange returned no access_token");
  if (process.env.GITHUB_ACTIONS) console.log(`::add-mask::${token}`);
  return token;
}

const token = await accessToken();
const auth = { Authorization: `Bearer ${token}` };

async function call(method, url, init = {}) {
  const res = await fetch(url, { method, ...init, headers: { ...auth, ...init.headers } });
  if (!res.ok) fail(`${method} ${new URL(url).pathname} failed: ${await errorText(res)}`);
  return res.json();
}
const fetchStatus = () => call("GET", `${API}/v2/${item}:fetchStatus`);

/** -1, 0 or 1, comparing dotted version strings numerically. */
function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff) return Math.sign(diff);
  }
  return 0;
}

const versions = (revision) =>
  (revision?.distributionChannels ?? []).map((channel) => channel.crxVersion).filter(Boolean);

// 1. The store must hold a lower version; the upload would be refused anyway, this says why.
const before = await fetchStatus();
const published = versions(before.publishedItemRevisionStatus);
const submitted = versions(before.submittedItemRevisionStatus);
summary(`Store item ${itemId}`);
const describe = (revision, list) =>
  revision ? `${revision.state} ${list.join(", ")}`.trim() : "none";
summary(`- published: ${describe(before.publishedItemRevisionStatus, published)}`);
summary(`- submitted: ${describe(before.submittedItemRevisionStatus, submitted)}`);
for (const version of [...published, ...submitted]) {
  if (compareVersions(expectedVersion, version) <= 0) {
    fail(`Version ${expectedVersion} is not higher than ${version} already in the store`);
  }
}
if (before.submittedItemRevisionStatus?.state === "PENDING_REVIEW") {
  fail("Another submission is pending review; cancel it in the dashboard or wait for the review");
}

// 2. Upload. Large packages are processed asynchronously: poll fetchStatus until done.
const upload = await call("POST", `${API}/upload/v2/${item}:upload`, {
  headers: { "Content-Type": "application/zip" },
  body: readFileSync(zip),
});
let uploadState = upload.uploadState;
// Only the synchronous response carries the version read from the package.
const crxVersion = upload.crxVersion;
const deadline = Date.now() + POLL_TIMEOUT_MS;
while (uploadState === "IN_PROGRESS" || uploadState === "UPLOAD_IN_PROGRESS") {
  if (Date.now() > deadline) fail("Upload still in progress after 10 minutes");
  console.log("Upload in progress, polling fetchStatus…");
  await sleep(POLL_INTERVAL_MS);
  const status = await fetchStatus();
  uploadState = status.lastAsyncUploadState;
}
if (uploadState !== "SUCCEEDED") fail(`Upload ended in state ${uploadState}`);
if (crxVersion && crxVersion !== expectedVersion) {
  fail(`Store read version ${crxVersion} from the upload, expected ${expectedVersion}`);
}
summary(`- uploaded ${expectedVersion}: ${uploadState}`);

// 3. Submit for review. Visibility (unlisted) and rollout stay as set in the dashboard.
const publish = await call("POST", `${API}/v2/${item}:publish`, {
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ publishType: "DEFAULT_PUBLISH" }),
});
summary(`- submitted for review: ${publish.state}`);
for (const warning of publish.warningInfo?.warnings ?? []) {
  summary(`- warning ${warning.reason}: ${warning.description}`);
}
