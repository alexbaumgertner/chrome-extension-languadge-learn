// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { verifyBundle } from "@/scripts/build-store-zip.mjs";

const API = "https://example.test";

const manifest = {
  manifest_version: 3,
  version: "1.2.3",
  permissions: ["storage", "activeTab", "scripting"],
  optional_host_permissions: ["*://*/*"],
  icons: { "128": "icon/128.png" },
};

let dir: string;

// A minimal unpacked build shaped like .output/chrome-mv3; `overrides` replaces or adds files.
function bundle(overrides: Record<string, string | object> = {}): string {
  dir = mkdtempSync(join(tmpdir(), "verify-bundle-"));
  const contents: Record<string, string | object> = {
    "manifest.json": manifest,
    "background.js": `const u="${API}";fetch(u+"/api/translate")`,
    "chunks/popup.js": "console.log('popup')",
    "_locales/en/messages.json": { extDescription: { message: "Learn German" } },
    "icon/128.png": "\x89PNG localhost",
    ...overrides,
  };
  for (const [file, body] of Object.entries(contents)) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), typeof body === "string" ? body : JSON.stringify(body));
  }
  return dir;
}

afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("verifyBundle", () => {
  it("accepts a release bundle and summarises it", () => {
    const result = verifyBundle(bundle(), { cmsBaseUrl: API, expectedVersion: "1.2.3" });

    expect(result.problems).toEqual([]);
    expect(result.summary).toEqual(
      expect.arrayContaining([
        "version 1.2.3 (expected 1.2.3)",
        `API ${API}`,
        "host_permissions none",
        "CSP default",
      ]),
    );
  });

  it("accepts a CSP that names only the API host", () => {
    const csp = { extension_pages: `script-src 'self'; connect-src 'self' ${API}` };
    const result = verifyBundle(
      bundle({ "manifest.json": { ...manifest, content_security_policy: csp } }),
      { cmsBaseUrl: API },
    );

    expect(result.problems).toEqual([]);
  });

  it("rejects a test build with local hosts, a wrong version and unexpected hosts", () => {
    const result = verifyBundle(
      bundle({
        "manifest.json": {
          ...manifest,
          version: "0.1.0",
          host_permissions: ["*://127.0.0.1/*"],
          content_security_policy: { extension_pages: "connect-src 'self' https://other.test" },
        },
        "background.js": 'fetch("http://127.0.0.1:58733/api/translate")',
        "chunks/popup.js": 'const dev="http://localhost:8787"',
      }),
      { cmsBaseUrl: API, expectedVersion: "1.2.3" },
    );

    expect(result.problems).toEqual(
      expect.arrayContaining([
        "unexpected host_permissions: *://127.0.0.1/*",
        "unexpected CSP source: https://other.test",
        "manifest version 0.1.0 != EXPECTED_VERSION 1.2.3",
        "manifest.json contains 127.0.0.1",
        "background.js contains 127.0.0.1",
        "chunks/popup.js contains localhost",
        `background does not call ${API}`,
      ]),
    );
    expect(result.problems).toHaveLength(7);
  });

  it("rejects an http API URL", () => {
    const result = verifyBundle(bundle({ "background.js": 'fetch("http://example.test")' }), {
      cmsBaseUrl: "http://example.test",
    });

    expect(result.problems).toContain("API base URL is not https: http://example.test");
  });
});
