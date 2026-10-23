# Data usage (Privacy practices tab)

Consistent with the published policy, <https://sprachweise.vercel.app/privacy> (updated 23 October
2026), and with the code that sends data: `apps/extension/lib/cms/client.ts`,
`apps/extension/lib/metrics/events.ts`, `apps/extension/lib/metrics/install-id.ts`.

## What the extension sends, and when

| Request                       | Sent when                                                                        | Contents                                                                                                                                                                                                                              | Not included                                      |
| ----------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `POST /api/translate`         | The user chooses "Translate to German (Sprachweise)" or presses the shortcut     | The selected text (at most 1,500 characters), the level (A1–A2, B1–B2, C1+) and a fixed topic label (`general`)                                                                                                                       | Page URL, title, the rest of the page, install ID |
| `POST /api/exercises`         | Right after a successful translation                                             | The German text returned for that selection, its highlighted words with their Russian meanings, level, topic. The server builds the exercises from these locally; it makes no AI call for them                                        | Page URL, the original text, install ID           |
| `POST /api/events`            | After a usage event, or at browser start for events left over from being offline | A random install ID and events: `install`, `paragraph_translated` (server cache hit or miss, request time in ms), `exercise_completed`, `client_error` (error code and HTTP status). Each event has its own random ID and a timestamp | Any text, URL or page content                     |
| `POST /api/report`            | Only when the user clicks "Bad translation" ("Плохой перевод")                   | The source text, the German translation shown, level, density (a vestigial fixed value with no UI, tracked in issue #7), model name, prompt version                                                                                   | Install ID                                        |
| `GET /api/health` (`no-cors`) | Only after a failed translation request, to tell "server down" from "blocked"    | Nothing (no body, no data)                                                                                                                                                                                                            | Everything                                        |

Page content is never read, and no text is sent, before the user's menu click or shortcut. The page address is never sent. The only request made without that action is the `install` usage event (with the random install ID) that the extension sends once when it is installed, and later retries of unsent events at browser start.

## Data types to declare

| Data type                           | Collected? | What and why                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Personally identifiable information | No         | No name, email, account or login.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Health information                  | No         |                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Financial and payment information   | No         |                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Authentication information          | No         | There is no sign-in.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Personal communications             | No         | The extension does not read email or messages. It sends only the text the user selects and asks to translate, and that falls under "Website content".                                                                                                                                                                                                                                                                                                    |
| Location                            | **Yes**    | IP address only, and only in our hosting provider's (Vercel) automatic request logs, as the privacy policy says. The app does not store IP addresses and requests no other location data. Ticked because Google's form counts IP address as location and the form must match the policy.                                                                                                                                                                 |
| Web history                         | No         | No URLs, page titles or visit times are collected.                                                                                                                                                                                                                                                                                                                                                                                                       |
| User activity                       | **Yes**    | Usage events tied to a random install ID (not linked to a name, email, device or account): install, paragraph translated (cache hit/miss, latency), exercise completed, error codes. Used only to count usage. Server keeps the day (UTC) and deletes events after 90 days.                                                                                                                                                                              |
| Website content                     | **Yes**    | The text the user selects and chooses to translate (at most 1,500 characters at a time), and the German text derived from it for exercises, sent to our server; the server passes the selected text and level to Google Gemini to translate it. On an explicit "Bad translation" click, the source text and its translation are also stored for quality review (deleted after 90 days). Used only to provide the translation and to improve its quality. |

## Purposes (use these if the form asks)

- Translation, vocabulary glosses and exercises: the single purpose of the extension.
- Usage metrics (counts of translations, exercises and errors): to know whether the beta works and
  how much it is used. Not used for advertising, profiling or personalisation.
- Bad-translation reports: to review and fix poor translations.

## Retention and sharing

- Translation cache: SHA-256 hash of the text (not the text), the German translation and Russian
  glosses; shared by all users, linked to nobody, kept until cleared.
- Metric events and bad-translation reports: automatically deleted after 90 days.
- Local data (settings, vocabulary, progress, saved translations, install ID, unsent events) stays in
  the browser and is removed with the extension.
- Third parties: Google Gemini API (translation) receives the selected text and level, nothing else.
  Vercel (hosting) and Neon (database, Frankfurt) process the traffic and storage on our behalf. We
  do not sell data or use it for advertising.
- Dictation: the German sentence is spoken by the browser's built-in speech synthesis. If Chrome
  picks an online Google voice, Chrome itself sends that sentence to Google, as the policy says.
  The extension does not call any TTS service.

## Certifications (tick all three)

- [ ] I do not sell or transfer user data to third parties, outside of the approved use cases.
- [ ] I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- [ ] I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** `https://sprachweise.vercel.app/privacy`
