import { Router, type IRouter } from "express";
import { gatewayFetch } from "../lib/gatewayClient.js";

const router: IRouter = Router();

interface GatewayKillEvent {
  killmail_id?: string;
  killer_character_id?: string;
  victim_character_id?: string;
  solar_system_id?: string;
  loss_type?: string;
  kill_timestamp?: string | number;
  [key: string]: unknown;
}

router.get("/kills", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const solarSystemId = req.query.solar_system_id as string | undefined;

  const { data, status } = await gatewayFetch<GatewayKillEvent[] | { kills?: GatewayKillEvent[]; events?: GatewayKillEvent[]; data?: GatewayKillEvent[] }>(
    `/smartassemblies/killmail?limit=${limit}`
  );

  let kills: GatewayKillEvent[] = [];

  if (data) {
    if (Array.isArray(data)) {
      kills = data;
    } else if (data.kills && Array.isArray(data.kills)) {
      kills = data.kills;
    } else if (data.events && Array.isArray(data.events)) {
      kills = data.events;
    } else if (data.data && Array.isArray(data.data)) {
      kills = data.data;
    }
  }

  if (solarSystemId) {
    kills = kills.filter(k => String(k.solar_system_id) === solarSystemId);
  }

  const normalized = kills.map(k => ({
    killmail_id: String(k.killmail_id ?? k.id ?? Math.random()),
    killer_character_id: String(k.killer_character_id ?? k.killerId ?? "unknown"),
    victim_character_id: String(k.victim_character_id ?? k.victimId ?? "unknown"),
    solar_system_id: String(k.solar_system_id ?? k.systemId ?? "unknown"),
    loss_type: String(k.loss_type ?? k.lossType ?? "SHIP").toUpperCase() === "STRUCTURE" ? "STRUCTURE" : "SHIP",
    kill_timestamp: String(k.kill_timestamp ?? k.timestamp ?? new Date().toISOString()),
  }));

  res.json({ kills: normalized, total: normalized.length, gateway_status: status });
});

export default router;
