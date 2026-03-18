import { Router, type IRouter } from "express";
import { queryIndexedAssemblies } from "../lib/telemetryIndexer.js";

const router: IRouter = Router();

router.get("/assemblies", async (req, res) => {
  try {
    const solarSystemId = req.query.solar_system_id as string | undefined;

    const assemblies = await queryIndexedAssemblies({
      solarSystemId,
    });

    const normalized = assemblies.map((a) => ({
      assembly_id: a.assembly_id,
      solar_system_id: a.solar_system_id,
      owner_character_id: a.owner_character_id,
      assembly_type: a.assembly_type,
      is_online: a.is_online,
      name: a.name,
    }));

    res.json({
      assemblies: normalized,
      total: normalized.length,
      gateway_status: "indexed",
    });
  } catch (err) {
    console.error("[assemblies] get error:", err);
    res.status(500).json({ error: "Failed to fetch indexed assemblies" });
  }
});

export default router;
