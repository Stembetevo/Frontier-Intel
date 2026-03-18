import { Router, type IRouter } from "express";
import { queryIndexedKills } from "../lib/telemetryIndexer.js";

const router: IRouter = Router();

router.get("/kills", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const solarSystemId = req.query.solar_system_id as string | undefined;

    const kills = await queryIndexedKills({
      limit,
      solarSystemId,
    });

    const normalized = kills.map((k) => ({
      killmail_id: k.killmail_id,
      killer_character_id: k.killer_character_id,
      victim_character_id: k.victim_character_id,
      solar_system_id: k.solar_system_id,
      loss_type: k.loss_type === "STRUCTURE" ? "STRUCTURE" : "SHIP",
      kill_timestamp: k.event_timestamp.toISOString(),
    }));

    res.json({
      kills: normalized,
      total: normalized.length,
      gateway_status: "indexed",
    });
  } catch (err) {
    console.error("[kills] get error:", err);
    res.status(500).json({ error: "Failed to fetch indexed kill events" });
  }
});

export default router;
