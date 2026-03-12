import { Router, type IRouter } from "express";
import { gatewayFetch } from "../lib/gatewayClient.js";
import { db } from "@workspace/db";
import { intelReportsTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

interface KillEvent {
  solar_system_id: string;
  kill_timestamp: string;
}

interface Assembly {
  solar_system_id: string;
}

interface JumpEvent {
  from_solar_system_id: string;
  to_solar_system_id: string;
  jump_timestamp: string;
}

function computeThreatLevel(kills1h: number): "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN" {
  if (kills1h >= 3) return "HIGH";
  if (kills1h >= 1) return "MEDIUM";
  return "LOW";
}

router.get("/systems", async (_req, res) => {
  try {
    const oneHourAgo = Date.now() - 3600_000;
    const oneDayAgo = Date.now() - 86400_000;

    const [killsResult, assembliesResult, jumpsResult] = await Promise.all([
      gatewayFetch<KillEvent[] | { kills?: KillEvent[]; data?: KillEvent[] }>(`/smartassemblies/killmail?limit=500`),
      gatewayFetch<Assembly[] | { assemblies?: Assembly[]; data?: Assembly[] }>(`/smartassemblies`),
      gatewayFetch<JumpEvent[] | { jumps?: JumpEvent[]; data?: JumpEvent[] }>(`/smartassemblies/gate/jump?limit=500`),
    ]);

    let kills: KillEvent[] = [];
    if (killsResult.data) {
      if (Array.isArray(killsResult.data)) kills = killsResult.data;
      else if ((killsResult.data as { kills?: KillEvent[] }).kills) kills = (killsResult.data as { kills: KillEvent[] }).kills;
      else if ((killsResult.data as { data?: KillEvent[] }).data) kills = (killsResult.data as { data: KillEvent[] }).data;
    }

    let assemblies: Assembly[] = [];
    if (assembliesResult.data) {
      if (Array.isArray(assembliesResult.data)) assemblies = assembliesResult.data;
      else if ((assembliesResult.data as { assemblies?: Assembly[] }).assemblies) assemblies = (assembliesResult.data as { assemblies: Assembly[] }).assemblies;
      else if ((assembliesResult.data as { data?: Assembly[] }).data) assemblies = (assembliesResult.data as { data: Assembly[] }).data;
    }

    let jumps: JumpEvent[] = [];
    if (jumpsResult.data) {
      if (Array.isArray(jumpsResult.data)) jumps = jumpsResult.data;
      else if ((jumpsResult.data as { jumps?: JumpEvent[] }).jumps) jumps = (jumpsResult.data as { jumps: JumpEvent[] }).jumps;
      else if ((jumpsResult.data as { data?: JumpEvent[] }).data) jumps = (jumpsResult.data as { data: JumpEvent[] }).data;
    }

    const systemMap = new Map<string, {
      kill_count_1h: number;
      kill_count_24h: number;
      jump_count_1h: number;
      assembly_count: number;
      intel_count: number;
      last_activity: number;
    }>();

    function getSystem(id: string) {
      if (!systemMap.has(id)) {
        systemMap.set(id, {
          kill_count_1h: 0, kill_count_24h: 0,
          jump_count_1h: 0, assembly_count: 0,
          intel_count: 0, last_activity: 0,
        });
      }
      return systemMap.get(id)!;
    }

    for (const k of kills) {
      const sid = String(k.solar_system_id ?? "unknown");
      if (sid === "unknown") continue;
      const sys = getSystem(sid);
      const ts = new Date(k.kill_timestamp).getTime();
      if (!isNaN(ts)) {
        if (ts > oneHourAgo) sys.kill_count_1h++;
        if (ts > oneDayAgo) sys.kill_count_24h++;
        if (ts > sys.last_activity) sys.last_activity = ts;
      } else {
        sys.kill_count_24h++;
      }
    }

    for (const a of assemblies) {
      const sid = String((a as { solar_system_id?: string }).solar_system_id ?? (a as { solarSystemId?: string }).solarSystemId ?? "unknown");
      if (sid === "unknown") continue;
      getSystem(sid).assembly_count++;
    }

    for (const j of jumps) {
      const from = String(j.from_solar_system_id ?? (j as { fromSystemId?: string }).fromSystemId ?? "unknown");
      const to = String(j.to_solar_system_id ?? (j as { toSystemId?: string }).toSystemId ?? "unknown");
      const ts = new Date(j.jump_timestamp ?? (j as { timestamp?: string }).timestamp ?? "").getTime();

      if (from !== "unknown" && !isNaN(ts) && ts > oneHourAgo) {
        getSystem(from).jump_count_1h++;
      }
      if (to !== "unknown" && !isNaN(ts) && ts > oneHourAgo) {
        getSystem(to).jump_count_1h++;
      }
    }

    try {
      const intelCounts = await db
        .select({
          solar_system_id: intelReportsTable.solar_system_id,
          count: sql<number>`count(*)::int`,
        })
        .from(intelReportsTable)
        .groupBy(intelReportsTable.solar_system_id);

      for (const row of intelCounts) {
        if (systemMap.has(row.solar_system_id)) {
          getSystem(row.solar_system_id).intel_count = row.count;
        }
      }
    } catch {
    }

    const systems = Array.from(systemMap.entries()).map(([sid, stats]) => ({
      solar_system_id: sid,
      threat_level: computeThreatLevel(stats.kill_count_1h),
      kill_count_1h: stats.kill_count_1h,
      kill_count_24h: stats.kill_count_24h,
      jump_count_1h: stats.jump_count_1h,
      assembly_count: stats.assembly_count,
      intel_count: stats.intel_count,
      last_activity: stats.last_activity > 0 ? new Date(stats.last_activity).toISOString() : undefined,
    }));

    res.json({ systems, total: systems.length, last_updated: new Date().toISOString() });
  } catch (err) {
    console.error("[systems] error:", err);
    res.status(500).json({ error: "Failed to compute system threats" });
  }
});

export default router;
