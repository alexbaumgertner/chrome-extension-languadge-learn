export function verifyBundle(
  dir: string,
  options: { cmsBaseUrl: string; expectedVersion?: string },
): { problems: string[]; summary: string[]; manifest: chrome.runtime.Manifest };
