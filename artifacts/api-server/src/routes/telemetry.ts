import { Router, type IRouter } from "express";
import {
  getTelemetryIndexerStatus,
  syncTelemetryOnchain,
} from "../lib/telemetryIndexer.js";

const router: IRouter = Router();

function hasSyncAccess(headers: Record<string, string | string[] | undefined>) {
  const expectedKey = process.env.TELEMETRY_SYNC_API_KEY?.trim();
  if (!expectedKey) return true;

  const headerKeyRaw = headers["x-telemetry-key"];
  const headerKey = Array.isArray(headerKeyRaw) ? headerKeyRaw[0] : headerKeyRaw;
  if (headerKey?.trim() === expectedKey) return true;

  const authRaw = headers.authorization;
  const authHeader = Array.isArray(authRaw) ? authRaw[0] : authRaw;
  if (authHeader?.startsWith("Bearer ")) {
    const bearer = authHeader.slice("Bearer ".length).trim();
    if (bearer === expectedKey) return true;
  }

  return false;
}

router.post("/telemetry/sync", async (req, res) => {
  if (!hasSyncAccess(req.headers)) {
    res.status(401).json({ error: "Unauthorized telemetry sync request" });
    return;
  }

  try {
    const requestedLimit = Number(req.body?.limit ?? 100);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(250, requestedLimit))
      : 100;

    const result = await syncTelemetryOnchain(limit);
    res.json(result);
  } catch (err) {
    console.error("[telemetry] sync error:", err);
    res.status(500).json({ error: "Failed to sync telemetry from chain" });
  }
});

router.get("/telemetry/status", async (_req, res) => {
  try {
    const status = await getTelemetryIndexerStatus();
    res.json(status);
  } catch (err) {
    console.error("[telemetry] status error:", err);
    res.status(500).json({ error: "Failed to fetch telemetry indexer status" });
  }
});

export default router;
