import { processImports } from "../imports/imports.server";
import { processDueRequests } from "./requests.server";

const INTERVAL_MS = 60 * 1000;

declare global {
  // eslint-disable-next-line no-var
  var blincRequestWorker: NodeJS.Timeout | undefined;
}

/**
 * Sends due review requests and reminders, and runs queued imports, every minute. Started once per server
 * process (dev reloads keep the global). Claims use SKIP LOCKED, so running
 * several app instances is safe.
 */
export function startRequestWorker() {
  if (
    global.blincRequestWorker ||
    process.env.DISABLE_REQUEST_WORKER === "true"
  )
    return;

  let running = false;
  global.blincRequestWorker = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await processDueRequests();
      await processImports();
    } catch (error) {
      console.error("[requests] worker pass failed", error);
    } finally {
      running = false;
    }
  }, INTERVAL_MS);
  global.blincRequestWorker.unref?.();
}
