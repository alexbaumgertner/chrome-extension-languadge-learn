import { formatLocalDate } from "@/lib/srs/scheduler";
import { getAllReviewQueue, getAllVocabulary } from "@/lib/storage/progress";
import { badgeText, countDue } from "./session";

/** Shows the number of words due today on the toolbar icon (empty when none are). */
export async function updateBadge(): Promise<void> {
  const [queue, vocab] = await Promise.all([getAllReviewQueue(), getAllVocabulary()]);
  const due = countDue(Object.values(queue), vocab, formatLocalDate(new Date()));
  await chrome.action.setBadgeText({ text: badgeText(due) });
  if (due > 0) await chrome.action.setBadgeBackgroundColor({ color: "#b45309" });
}
