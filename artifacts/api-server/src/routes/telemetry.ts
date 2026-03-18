import { Router, type IRouter } from "express";
import {
  getTelemetryIndexerStatus,
  syncTelemetryOnchain,
} from "../lib/telemetryIndexer.js";

const router: IRouter = Router();

router.post("/telemetry/sync", async (req, res) => {
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
