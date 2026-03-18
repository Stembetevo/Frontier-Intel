import { Router, type IRouter } from "express";
import { prisma } from "@workspace/db";

const router: IRouter = Router();

function computeThreatLevel(kills1h: number): "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN" {
  if (kills1h >= 3) return "HIGH";
  if (kills1h >= 1) return "MEDIUM";
  return "LOW";
}

router.get("/systems", async (_req, res) => {
  try {
    const oneHourAgo = new Date(Date.now() - 3600_000);
    const oneDayAgo = new Date(Date.now() - 86400_000);

    // Fetch all recent data and aggregate in JavaScript
    const [
      allKills1h,
      allKills24h,
      allJumps1h,
      allAssemblies,
      allIntelReports,
    ] = await Promise.all([
      prisma.telemetryKill.findMany({
        where: { event_timestamp: { gte: oneHourAgo } },
      }),
      prisma.telemetryKill.findMany({
        where: { event_timestamp: { gte: oneDayAgo } },
      }),
      prisma.telemetryJump.findMany({
        where: { event_timestamp: { gte: oneHourAgo } },
      }),
      prisma.telemetryAssembly.findMany(),
      prisma.intelReport.findMany(),
    ]);

    const systemMap = new Map<
      string,
      {
        kill_count_1h: number;
        kill_count_24h: number;
        jump_count_1h: number;
        assembly_count: number;
        intel_count: number;
        last_activity: number;
      }
    >();

    const getSystem = (id: string) => {
      if (!systemMap.has(id)) {
        systemMap.set(id, {
          kill_count_1h: 0,
          kill_count_24h: 0,
          jump_count_1h: 0,
          assembly_count: 0,
          intel_count: 0,
          last_activity: 0,
        });
      }
      return systemMap.get(id)!;
    };
      // Count kills in 1h
      for (const kill of allKills1h) {
        const sys = getSystem(kill.solar_system_id);
        sys.kill_count_1h += 1;
        const ts = kill.event_timestamp.getTime();
        sys.last_activity = Math.max(sys.last_activity, ts);
      getSystem(row.solar_system_id).kill_count_1h = row.count;
    }
      // Count kills in 24h
      for (const kill of allKills24h) {
        const sys = getSystem(kill.solar_system_id);
        sys.kill_count_24h += 1;
      getSystem(row.solar_system_id).kill_count_24h = row.count;
    }
      // Count jumps in 1h
      for (const jump of allJumps1h) {
        if (jump.from_solar_system_id) {
          const sys = getSystem(jump.from_solar_system_id);
          sys.jump_count_1h += 1;
          const ts = jump.event_timestamp.getTime();
          sys.last_activity = Math.max(sys.last_activity, ts);
        getSystem(row.from_solar_system_id).jump_count_1h += row.count;
        if (jump.to_solar_system_id) {
          const sys = getSystem(jump.to_solar_system_id);
          sys.jump_count_1h += 1;
          const ts = jump.event_timestamp.getTime();
          sys.last_activity = Math.max(sys.last_activity, ts);
        getSystem(row.to_solar_system_id).jump_count_1h += row.count;
      }
    }
      // Count assemblies
      for (const assembly of allAssemblies) {
        const sys = getSystem(assembly.solar_system_id);
        sys.assembly_count += 1;
        const ts = assembly.event_timestamp.getTime();
        sys.last_activity = Math.max(sys.last_activity, ts);
      getSystem(row.solar_system_id).assembly_count = row.count;
    }
      // Count intel reports
      for (const report of allIntelReports) {
        const sys = getSystem(report.solar_system_id);
        sys.intel_count += 1;
      }
    }

    const systems = Array.from(systemMap.entries())
      .map(([sid, stats]) => ({
        solar_system_id: sid,
        threat_level: computeThreatLevel(stats.kill_count_1h),
        kill_count_1h: stats.kill_count_1h,
        kill_count_24h: stats.kill_count_24h,
        jump_count_1h: stats.jump_count_1h,
        assembly_count: stats.assembly_count,
        intel_count: stats.intel_count,
        last_activity:
          stats.last_activity > 0
            ? new Date(stats.last_activity).toISOString()
            : undefined,
      }))
      .sort((a, b) => b.kill_count_1h - a.kill_count_1h);

    res.json({ systems, total: systems.length, last_updated: new Date().toISOString() });
  } catch (err) {
    console.error("[systems] error:", err);
    res.status(500).json({ error: "Failed to compute system threats" });
  }
});

export default router;
