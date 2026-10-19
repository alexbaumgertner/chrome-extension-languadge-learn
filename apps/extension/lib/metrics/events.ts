import { EventsRequestSchema, MetricEventSchema, type MetricEvent } from "@sprachweise/shared";
import { z } from "zod";
import { CMS_BASE_URL } from "@/lib/config";
import { getOrCreateInstallId } from "@/lib/metrics/install-id";

const QUEUE_KEY = "metricsQueue";
/** Oldest events are dropped beyond this, so a long offline stretch can't grow storage unbounded. */
const MAX_QUEUED = 200;
const BATCH_SIZE = 50;

const QueueSchema = z.array(MetricEventSchema);

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
/** What callers record; the timestamp is added here and the install event is implicit. */
export type UsageEvent = Exclude<DistributiveOmit<MetricEvent, "occurredAt">, { name: "install" }>;

async function readQueue(): Promise<MetricEvent[]> {
  const parsed = QueueSchema.safeParse((await chrome.storage.local.get(QUEUE_KEY))[QUEUE_KEY]);
  return parsed.success ? parsed.data : [];
}

async function writeQueue(events: MetricEvent[]): Promise<void> {
  await chrome.storage.local.set({ [QUEUE_KEY]: events.slice(-MAX_QUEUED) });
}

/** Every queue read-modify-write runs through this chain, so concurrent records can't lose events. */
let chain: Promise<unknown> = Promise.resolve();
function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task);
  chain = run.catch(() => undefined);
  return run;
}

async function enqueue(events: MetricEvent[]): Promise<void> {
  await writeQueue([...(await readQueue()), ...events]);
}

/**
 * Sends queued events, oldest first. Sent or rejected (400) batches leave the queue; a network
 * failure or server error keeps them for the next attempt.
 */
async function flush(): Promise<void> {
  const { installId } = await getOrCreateInstallId();
  for (;;) {
    const queue = await readQueue();
    if (queue.length === 0) return;
    const batch = queue.slice(0, BATCH_SIZE);
    const body = EventsRequestSchema.parse({ installId, events: batch });
    let res: Response;
    try {
      res = await fetch(`${CMS_BASE_URL}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      return; // offline — retried on the next event or startup
    }
    if (!res.ok && res.status !== 400) return;
    await writeQueue((await readQueue()).slice(batch.length));
  }
}

/**
 * Records one usage-metric event and tries to send the queue. The only network path that carries
 * the install ID (constitution III). Never throws: metrics must never break translation.
 */
export function recordEvent(event: UsageEvent): Promise<void> {
  return serialized(async () => {
    // Storage cleared since install: the new ID starts with its own install event.
    const { created } = await getOrCreateInstallId();
    const occurredAt = new Date().toISOString();
    const events: MetricEvent[] = created ? [{ name: "install", occurredAt }] : [];
    events.push({ ...event, occurredAt });
    await enqueue(events);
    await flush();
  }).catch((err: unknown) => console.error("Sprachweise: metric event failed", err));
}

/** On install: create the install ID and record the install event, once. */
export function recordInstallIfNew(): Promise<void> {
  return serialized(async () => {
    const { created } = await getOrCreateInstallId();
    if (created) await enqueue([{ name: "install", occurredAt: new Date().toISOString() }]);
    await flush();
  }).catch((err: unknown) => console.error("Sprachweise: install event failed", err));
}

/** Retries events left over from an offline period. */
export function flushEvents(): Promise<void> {
  return serialized(flush).catch((err: unknown) =>
    console.error("Sprachweise: metric flush failed", err),
  );
}
