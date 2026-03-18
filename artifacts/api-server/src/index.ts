import app from "./app";
import { syncTelemetryOnchain } from "./lib/telemetryIndexer.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const telemetrySyncEnabled = process.env.TELEMETRY_SYNC_ENABLED !== "false";
const telemetrySyncOnStart = process.env.TELEMETRY_SYNC_ON_START !== "false";
const telemetrySyncLimit = (() => {
  const parsed = Number(process.env.TELEMETRY_SYNC_LIMIT ?? 200);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(250, parsed)) : 200;
})();
const telemetrySyncIntervalMs = (() => {
  const parsed = Number(process.env.TELEMETRY_SYNC_INTERVAL_MS ?? 60_000);
  return Number.isFinite(parsed) ? Math.max(5_000, parsed) : 60_000;
})();

let isTelemetrySyncRunning = false;

async function runTelemetrySync(reason: "startup" | "interval") {
  if (isTelemetrySyncRunning) {
    return;
  }

  isTelemetrySyncRunning = true;
  try {
    const result = await syncTelemetryOnchain(telemetrySyncLimit);
    console.log(
      `[telemetry] ${reason} sync complete (synced=${result.total_synced}, skipped=${result.total_skipped})`,
    );
  } catch (error) {
    console.error(`[telemetry] ${reason} sync failed`, error);
  } finally {
    isTelemetrySyncRunning = false;
  }
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);

  if (!telemetrySyncEnabled) {
    console.log("[telemetry] auto-sync disabled (TELEMETRY_SYNC_ENABLED=false)");
    return;
  }

  if (telemetrySyncOnStart) {
    void runTelemetrySync("startup");
  }

  const timer = setInterval(() => {
    void runTelemetrySync("interval");
  }, telemetrySyncIntervalMs);

  if (typeof timer.unref === "function") {
    timer.unref();
  }

  console.log(
    `[telemetry] auto-sync running every ${telemetrySyncIntervalMs}ms (limit=${telemetrySyncLimit})`,
  );
});
