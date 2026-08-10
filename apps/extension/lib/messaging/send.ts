import type { RequestMessage } from "@sprachweise/shared";

/** Thin wrapper over chrome.runtime.sendMessage — content/popup/options never touch storage directly. */
export async function sendMessage<TResponse>(message: RequestMessage): Promise<TResponse> {
  return (await chrome.runtime.sendMessage(message)) as TResponse;
}
