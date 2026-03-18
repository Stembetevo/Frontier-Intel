import { prisma } from "@workspace/db";
import {
  type SuiEventEnvelope,
  type SuiEventId,
  type SuiEventsPage,
  getSuiRpcUrl,
  parseStringField,
  suiRpcCall,
  toIsoFromUnknownTimestamp,
} from "./suiRpc.js";

const DEFAULT_WORLD_PACKAGE_ID =
  "0x2ff3e06b96eb830bdcffbc6cae9b8fe43f005c3b94cef05d9ec23057df16f107";

type Stream = "kills" | "jumps" | "assemblies";

type SyncSummary = {
  stream: Stream;
  package_id: string;
  module: string;
  synced_count: number;
  skipped_count: number;
  next_cursor: SuiEventId | null;
  has_next_page: boolean;
};

function getPackageIds(): string[] {
  const raw = (process.env.INDEXER_PACKAGE_IDS || DEFAULT_WORLD_PACKAGE_ID).trim();
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function getModules(envVar: string, defaults: string[]): string[] {
  const raw = (process.env[envVar] || "").trim();
  if (!raw) return defaults;
  const modules = raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return modules.length > 0 ? modules : defaults;
}

function buildSources() {
  const packageIds = getPackageIds();
  const killModules = getModules("INDEXER_KILL_MODULES", ["killmail"]);
  const jumpModules = getModules("INDEXER_JUMP_MODULES", ["gate"]);
  const assemblyModules = getModules("INDEXER_ASSEMBLY_MODULES", [
    "smartassemblies",
    "smart_assembly",
    "assembly",
  ]);

  return {
    kills: packageIds.flatMap((pkg) =>
      killModules.map((module) => ({ packageId: pkg, module })),
    ),
    jumps: packageIds.flatMap((pkg) =>
      jumpModules.map((module) => ({ packageId: pkg, module })),
    ),
    assemblies: packageIds.flatMap((pkg) =>
      assemblyModules.map((module) => ({ packageId: pkg, module })),
    ),
  };
}

function cursorKey(stream: Stream, packageId: string, module: string) {
  return `${stream}:${packageId}:${module}`;
}

async function getCursor(streamKey: string): Promise<SuiEventId | null> {
  const existing = await prisma.telemetryCursor.findUnique({
    where: { stream_key: streamKey },
  });

  if (!existing?.cursor_json) {
    return null;
  }

  try {
    return JSON.parse(existing.cursor_json) as SuiEventId;
  } catch {
    return null;
  }
}

async function saveCursor(streamKey: string, cursor: SuiEventId | null) {
  const cursor_json = cursor ? JSON.stringify(cursor) : null;
  await prisma.telemetryCursor.upsert({
    where: { stream_key: streamKey },
    update: {
      cursor_json,
      updated_at: new Date(),
    },
    create: {
      stream_key: streamKey,
      cursor_json,
    },
  });
}

function parseLossType(raw: unknown): "SHIP" | "STRUCTURE" {
  const value = String(raw || "SHIP").toUpperCase();
  return value === "STRUCTURE" ? "STRUCTURE" : "SHIP";
}

function inferAssemblyType(raw: unknown): string {
  const value = String(raw || "").toLowerCase();
  if (value.includes("gate")) return "GATE";
  if (value.includes("turret")) return "TURRET";
  if (value.includes("storage")) return "STORAGE_UNIT";
  if (value.includes("network") || value.includes("node")) return "NETWORK_NODE";
  return "UNKNOWN";
}

function toEventIdentity(event: SuiEventEnvelope) {
  const txDigest = String(event.id?.txDigest || "");
  const eventSeq = String(event.id?.eventSeq || "");
  return { txDigest, eventSeq };
}

function readParsed(event: SuiEventEnvelope) {
  return event.parsedJson || {};
}

function isUniqueConstraintError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const maybe = err as { code?: unknown };
  return maybe.code === "P2002";
}

async function indexKillEvent(event: SuiEventEnvelope): Promise<boolean> {
  const { txDigest, eventSeq } = toEventIdentity(event);
  if (!txDigest || !eventSeq) return false;

  const parsed = readParsed(event);
  const killmailId = String(parsed.killmail_id || parsed.killmailId || `${txDigest}:${eventSeq}`);
  const killerCharacterId = String(parsed.killer_character_id || parsed.killerId || parsed.attacker_id || "unknown");
  const victimCharacterId = String(parsed.victim_character_id || parsed.victimId || "unknown");
  const solarSystemId = parseStringField(parsed.solar_system_id || parsed.systemId || "");
  if (!solarSystemId) return false;

  const eventTimestampIso = toIsoFromUnknownTimestamp(
    parsed.kill_timestamp || parsed.timestamp || parsed.timestamp_ms || event.timestampMs,
  );

  try {
    await prisma.telemetryKill.create({
      data: {
      tx_digest: txDigest,
      event_seq: eventSeq,
      killmail_id: killmailId,
      killer_character_id: killerCharacterId,
      victim_character_id: victimCharacterId,
      solar_system_id: solarSystemId,
      loss_type: parseLossType(parsed.loss_type || parsed.lossType),
      event_timestamp: new Date(eventTimestampIso),
      },
    });
  } catch (e: unknown) {
    // Unique constraint violation - already indexed, ignore
    if (isUniqueConstraintError(e)) {
      return true; // Count as processed
    }
    throw e;
  }

  return true;
}

async function indexJumpEvent(event: SuiEventEnvelope): Promise<boolean> {
  const { txDigest, eventSeq } = toEventIdentity(event);
  if (!txDigest || !eventSeq) return false;

  const parsed = readParsed(event);
  const characterId = String(parsed.character_id || parsed.characterId || parsed.pilot_id || "unknown");
  const fromSolarSystemId = parseStringField(parsed.from_solar_system_id || parsed.fromSystemId || "");
  const toSolarSystemId = parseStringField(parsed.to_solar_system_id || parsed.toSystemId || "");
  if (!fromSolarSystemId || !toSolarSystemId) return false;

  const eventTimestampIso = toIsoFromUnknownTimestamp(
    parsed.jump_timestamp || parsed.timestamp || parsed.timestamp_ms || event.timestampMs,
  );

  try {
    await prisma.telemetryJump.create({
      data: {
      tx_digest: txDigest,
      event_seq: eventSeq,
      character_id: characterId,
      from_solar_system_id: fromSolarSystemId,
      to_solar_system_id: toSolarSystemId,
      gate_id: parsed.gate_id ? String(parsed.gate_id || parsed.gateId) : null,
      event_timestamp: new Date(eventTimestampIso),
      },
    });
  } catch (e: unknown) {
    // Unique constraint violation - already indexed, ignore
    if (isUniqueConstraintError(e)) {
      return true;
    }
    throw e;
  }

  return true;
}

async function indexAssemblyEvent(event: SuiEventEnvelope): Promise<boolean> {
  const { txDigest, eventSeq } = toEventIdentity(event);
  if (!txDigest || !eventSeq) return false;

  const parsed = readParsed(event);
  const assemblyId = String(parsed.assembly_id || parsed.id || `${txDigest}:${eventSeq}`);
  const solarSystemId = parseStringField(parsed.solar_system_id || parsed.solarSystemId || "");
  if (!solarSystemId) return false;

  const ownerCharacterId = String(parsed.owner_character_id || parsed.ownerId || "unknown");
  const assemblyTypeRaw = parsed.assembly_type || parsed.assemblyType || parsed.typeId;
  const eventTimestampIso = toIsoFromUnknownTimestamp(
    parsed.timestamp || parsed.timestamp_ms || event.timestampMs,
  );

  await prisma.telemetryAssembly.upsert({
    where: { assembly_id: assemblyId },
    create: {
      assembly_id: assemblyId,
      solar_system_id: solarSystemId,
      owner_character_id: ownerCharacterId,
      assembly_type: inferAssemblyType(assemblyTypeRaw),
      is_online: Boolean(parsed.is_online ?? parsed.isOnline ?? false),
      name: String(parsed.name || "Unknown Assembly"),
      tx_digest: txDigest,
      event_seq: eventSeq,
      event_timestamp: new Date(eventTimestampIso),
    },
    update: {
        solar_system_id: solarSystemId,
        owner_character_id: ownerCharacterId,
        assembly_type: inferAssemblyType(assemblyTypeRaw),
        is_online: Boolean(parsed.is_online ?? parsed.isOnline ?? false),
        name: String(parsed.name || "Unknown Assembly"),
        tx_digest: txDigest,
        event_seq: eventSeq,
        event_timestamp: new Date(eventTimestampIso),
    },
  });

  return true;
}

async function syncSource(
  stream: Stream,
  packageId: string,
  module: string,
  limit: number,
): Promise<SyncSummary> {
  const streamKey = cursorKey(stream, packageId, module);
  const cursor = await getCursor(streamKey);

  const page = await suiRpcCall<SuiEventsPage>("suix_queryEvents", [
    {
      MoveModule: {
        package: packageId,
        module,
      },
    },
    cursor,
    limit,
    false,
  ]);

  let syncedCount = 0;
  let skippedCount = 0;

  for (const event of page.data || []) {
    try {
      let indexed = false;
      if (stream === "kills") indexed = await indexKillEvent(event);
      if (stream === "jumps") indexed = await indexJumpEvent(event);
      if (stream === "assemblies") indexed = await indexAssemblyEvent(event);

      if (indexed) syncedCount += 1;
      else skippedCount += 1;
    } catch {
      skippedCount += 1;
    }
  }

  const nextCursor = page.nextCursor || null;
  await saveCursor(streamKey, nextCursor);

  return {
    stream,
    package_id: packageId,
    module,
    synced_count: syncedCount,
    skipped_count: skippedCount,
    next_cursor: nextCursor,
    has_next_page: Boolean(page.hasNextPage),
  };
}

export async function syncTelemetryOnchain(limit = 100) {
  const clampedLimit = Math.max(1, Math.min(250, limit));
  const sources = buildSources();

  const summaries: SyncSummary[] = [];

  for (const source of sources.kills) {
    summaries.push(await syncSource("kills", source.packageId, source.module, clampedLimit));
  }
  for (const source of sources.jumps) {
    summaries.push(await syncSource("jumps", source.packageId, source.module, clampedLimit));
  }
  for (const source of sources.assemblies) {
    summaries.push(await syncSource("assemblies", source.packageId, source.module, clampedLimit));
  }

  return {
    rpc_url: getSuiRpcUrl(),
    package_ids: getPackageIds(),
    summaries,
    total_synced: summaries.reduce((acc, s) => acc + s.synced_count, 0),
    total_skipped: summaries.reduce((acc, s) => acc + s.skipped_count, 0),
    synced_at: new Date().toISOString(),
  };
}

export async function queryIndexedKills(options?: {
  limit?: number;
  solarSystemId?: string;
}) {
  const limit = Math.max(1, Math.min(500, options?.limit ?? 100));
  const solarSystemId = options?.solarSystemId?.trim();

  return prisma.telemetryKill.findMany({
    where: solarSystemId ? { solar_system_id: solarSystemId } : undefined,
    orderBy: { event_timestamp: "desc" },
    take: limit,
  });
}

export async function queryIndexedJumps(options?: { limit?: number }) {
  const limit = Math.max(1, Math.min(500, options?.limit ?? 200));
  return prisma.telemetryJump.findMany({
    orderBy: { event_timestamp: "desc" },
    take: limit,
  });
}

export async function queryIndexedAssemblies(options?: { solarSystemId?: string }) {
  const solarSystemId = options?.solarSystemId?.trim();

  return prisma.telemetryAssembly.findMany({
    where: solarSystemId ? { solar_system_id: solarSystemId } : undefined,
    orderBy: { event_timestamp: "desc" },
  });
}

export async function getTelemetryIndexerStatus() {
  const keys: Array<{ stream_key: string; updated_at: Date; cursor_json: string | null }> =
    await prisma.telemetryCursor.findMany({
      select: {
        stream_key: true,
        updated_at: true,
        cursor_json: true,
      },
      orderBy: { updated_at: "desc" },
    });

  return {
    rpc_url: getSuiRpcUrl(),
    package_ids: getPackageIds(),
    cursor_count: keys.length,
    cursors: keys.map((row) => ({
      stream_key: row.stream_key,
      updated_at: row.updated_at.toISOString(),
      has_cursor: Boolean(row.cursor_json),
    })),
    checked_at: new Date().toISOString(),
  };
}

