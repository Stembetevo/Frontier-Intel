import { Router, type IRouter } from "express";
import { gatewayFetch } from "../lib/gatewayClient.js";

const router: IRouter = Router();

interface GatewayAssembly {
  id?: string;
  assembly_id?: string;
  solar_system_id?: string;
  solarSystemId?: string;
  owner_character_id?: string;
  ownerId?: string;
  assembly_type?: string;
  assemblyType?: string;
  typeId?: string;
  is_online?: boolean;
  isOnline?: boolean;
  name?: string;
  [key: string]: unknown;
}

function inferAssemblyType(assembly: GatewayAssembly): string {
  const raw = String(assembly.assembly_type ?? assembly.assemblyType ?? assembly.typeId ?? "").toLowerCase();
  if (raw.includes("gate")) return "GATE";
  if (raw.includes("turret")) return "TURRET";
  if (raw.includes("storage")) return "STORAGE_UNIT";
  if (raw.includes("network") || raw.includes("node")) return "NETWORK_NODE";
  return "UNKNOWN";
}

router.get("/assemblies", async (req, res) => {
  const solarSystemId = req.query.solar_system_id as string | undefined;

  const { data, status } = await gatewayFetch<GatewayAssembly[] | { assemblies?: GatewayAssembly[]; data?: GatewayAssembly[] }>(
    `/smartassemblies`
  );

  let assemblies: GatewayAssembly[] = [];

  if (data) {
    if (Array.isArray(data)) {
      assemblies = data;
    } else if (data.assemblies && Array.isArray(data.assemblies)) {
      assemblies = data.assemblies;
    } else if (data.data && Array.isArray(data.data)) {
      assemblies = data.data;
    }
  }

  if (solarSystemId) {
    assemblies = assemblies.filter(a => {
      const sid = String(a.solar_system_id ?? a.solarSystemId ?? "");
      return sid === solarSystemId;
    });
  }

  const normalized = assemblies.map(a => ({
    assembly_id: String(a.assembly_id ?? a.id ?? Math.random()),
    solar_system_id: String(a.solar_system_id ?? a.solarSystemId ?? "unknown"),
    owner_character_id: String(a.owner_character_id ?? a.ownerId ?? "unknown"),
    assembly_type: inferAssemblyType(a),
    is_online: Boolean(a.is_online ?? a.isOnline ?? false),
    name: String(a.name ?? "Unknown Assembly"),
  }));

  res.json({ assemblies: normalized, total: normalized.length, gateway_status: status });
});

export default router;
