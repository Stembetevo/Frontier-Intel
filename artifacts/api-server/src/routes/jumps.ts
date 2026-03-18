import { Router, type IRouter } from "express";
import { queryIndexedJumps } from "../lib/telemetryIndexer.js";

const router: IRouter = Router();

router.get("/jumps", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const jumps = await queryIndexedJumps({ limit });

    const normalized = jumps.map((j) => ({
      character_id: j.character_id,
      from_solar_system_id: j.from_solar_system_id,
      to_solar_system_id: j.to_solar_system_id,
      jump_timestamp: j.event_timestamp.toISOString(),
      gate_id: j.gate_id || undefined,
    }));

    res.json({
      jumps: normalized,
      total: normalized.length,
      gateway_status: "indexed",
    });
  } catch (err) {
    console.error("[jumps] get error:", err);
    res.status(500).json({ error: "Failed to fetch indexed jump events" });
  }
});

export default router;
