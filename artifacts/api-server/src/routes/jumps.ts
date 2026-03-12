import { Router, type IRouter } from "express";
import { gatewayFetch } from "../lib/gatewayClient.js";

const router: IRouter = Router();

interface GatewayJump {
  character_id?: string;
  characterId?: string;
  from_solar_system_id?: string;
  fromSystemId?: string;
  to_solar_system_id?: string;
  toSystemId?: string;
  jump_timestamp?: string | number;
  timestamp?: string | number;
  gate_id?: string;
  gateId?: string;
  [key: string]: unknown;
}

router.get("/jumps", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 500);

  const { data, status } = await gatewayFetch<GatewayJump[] | { jumps?: GatewayJump[]; events?: GatewayJump[]; data?: GatewayJump[] }>(
    `/smartassemblies/gate/jump?limit=${limit}`
  );

  let jumps: GatewayJump[] = [];

  if (data) {
    if (Array.isArray(data)) {
      jumps = data;
    } else if ((data as { jumps?: GatewayJump[] }).jumps && Array.isArray((data as { jumps?: GatewayJump[] }).jumps)) {
      jumps = (data as { jumps: GatewayJump[] }).jumps;
    } else if ((data as { events?: GatewayJump[] }).events && Array.isArray((data as { events?: GatewayJump[] }).events)) {
      jumps = (data as { events: GatewayJump[] }).events;
    } else if ((data as { data?: GatewayJump[] }).data && Array.isArray((data as { data?: GatewayJump[] }).data)) {
      jumps = (data as { data: GatewayJump[] }).data;
    }
  }

  const normalized = jumps.map(j => ({
    character_id: String(j.character_id ?? j.characterId ?? "unknown"),
    from_solar_system_id: String(j.from_solar_system_id ?? j.fromSystemId ?? "unknown"),
    to_solar_system_id: String(j.to_solar_system_id ?? j.toSystemId ?? "unknown"),
    jump_timestamp: String(j.jump_timestamp ?? j.timestamp ?? new Date().toISOString()),
    gate_id: j.gate_id ? String(j.gate_id ?? j.gateId) : undefined,
  }));

  res.json({ jumps: normalized, total: normalized.length, gateway_status: status });
});

export default router;
