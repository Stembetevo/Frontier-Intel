import { Router, type IRouter } from "express";
import { prisma } from "@workspace/db";

const router: IRouter = Router();

const DEFAULT_TESTNET_RPC = "https://fullnode.testnet.sui.io:443";
const REPORT_TYPE_FROM_U8: Record<number, string> = {
  0: "FLEET_SPOTTED",
  1: "AMBUSH",
  2: "TRADE_ROUTE",
  4: "SAFE",
  5: "OTHER",
};

function getIntelPackageId() {
  return (
    process.env.INTEL_PACKAGE_ID ||
    process.env.VITE_INTEL_PACKAGE_ID ||
    ""
  ).trim();
}

function getSuiRpcUrl() {
  return (process.env.SUI_RPC_URL || DEFAULT_TESTNET_RPC).trim();
}

async function suiRpcCall<T>(method: string, params: unknown[]) {
  const rpcUrl = getSuiRpcUrl();
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`Sui RPC ${method} failed with status ${response.status}`);
  }

  const data = (await response.json()) as { result?: T; error?: { message?: string } };
  if (data.error) {
    throw new Error(data.error.message || `Sui RPC ${method} returned an error`);
  }

  return data.result as T;
}

function parseStringField(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "bytes" in value) {
    const bytes = (value as { bytes?: unknown }).bytes;
    if (typeof bytes === "string") return bytes;
  }
  return "";
}

async function getReportMessage(reportId: string): Promise<string> {
  type GetObjectResult = {
    data?: {
      content?: {
        dataType?: string;
        fields?: Record<string, unknown>;
      };
    };
  };

  const objectResult = await suiRpcCall<GetObjectResult>("sui_getObject", [
    reportId,
    { showContent: true },
  ]);

  const fields = objectResult?.data?.content?.fields;
  if (!fields) return "[on-chain report]";

  const message = parseStringField(fields.message);
  return message || "[on-chain report]";
}

router.get("/intel", async (req, res) => {
  try {
    const solarSystemId = req.query.solar_system_id as string | undefined;

    const reports = await prisma.intelReport.findMany({
      where: solarSystemId ? { solar_system_id: solarSystemId } : undefined,
      orderBy: { created_at: "desc" },
      take: solarSystemId ? 50 : 200,
    });

    const serialized = reports.map((r) => ({
      ...r,
      created_at: r.created_at.toISOString(),
      expires_at: r.expires_at ? r.expires_at.toISOString() : undefined,
    }));

    res.json({ reports: serialized, total: serialized.length });
  } catch (err) {
    console.error("[intel] get error:", err);
    res.status(500).json({ error: "Failed to fetch intel reports" });
  }
});

router.post("/intel", async (req, res) => {
  try {
    const {
      solar_system_id,
      message,
      wallet_address,
      report_type,
      signature,
      tx_digest,
      on_chain_report_id,
    } = req.body;

    if (!solar_system_id || !message || !wallet_address || !report_type) {
      return res.status(400).json({ error: "Missing required fields: solar_system_id, message, wallet_address, report_type" });
    }

    const validTypes = ["FLEET_SPOTTED", "AMBUSH", "SAFE", "TRADE_ROUTE", "OTHER"];
    if (!validTypes.includes(report_type)) {
      return res.status(400).json({ error: `Invalid report_type. Must be one of: ${validTypes.join(", ")}` });
    }

    if (message.length > 1024) {
      return res.status(400).json({ error: "Message too long (max 1024 chars)" });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const created = await prisma.intelReport.create({
      data: {
        solar_system_id,
        message: message.trim(),
        wallet_address,
        report_type,
        signature: signature || null,
        tx_digest: tx_digest || signature || null,
        on_chain_report_id: on_chain_report_id || null,
        expires_at: expiresAt,
      },
    });

    return res.status(201).json({
      ...created,
      created_at: created.created_at.toISOString(),
      expires_at: created.expires_at ? created.expires_at.toISOString() : undefined,
    });
  } catch (err) {
    console.error("[intel] post error:", err);
    return res.status(500).json({ error: "Failed to create intel report" });
  }
});

router.post("/intel/sync-onchain", async (req, res) => {
  try {
    const packageId = getIntelPackageId();
    if (!packageId) {
      return res.status(400).json({
        error: "Missing INTEL_PACKAGE_ID (or VITE_INTEL_PACKAGE_ID) in environment",
      });
    }

    const requestedLimit = Number(req.body?.limit ?? 25);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(100, requestedLimit))
      : 25;
    const cursor = req.body?.cursor ?? null;

    type QueryEventsResult = {
      data: Array<{
        id?: { txDigest?: string; eventSeq?: string };
        parsedJson?: Record<string, unknown>;
      }>;
      nextCursor?: unknown;
      hasNextPage?: boolean;
    };

    const eventType = `${packageId}::intel_report::IntelReportSubmitted`;
    const eventsPage = await suiRpcCall<QueryEventsResult>("suix_queryEvents", [
      { MoveEventType: eventType },
      cursor,
      limit,
      false,
    ]);

    const synced: Array<{ tx_digest: string; report_id: string }> = [];
    const skipped: Array<{ tx_digest: string; reason: string }> = [];

    for (const eventItem of eventsPage.data || []) {
      const parsed = eventItem.parsedJson || {};
      const reportId = String(parsed.report_id || "");
      const solarSystemId = parseStringField(parsed.solar_system_id);
      const author = String(parsed.author || "");
      const timestampMs = Number(parsed.timestamp_ms || 0);
      const txDigest = String(eventItem.id?.txDigest || "");
      const reportTypeU8 = Number(parsed.report_type || 5);
      const reportType = REPORT_TYPE_FROM_U8[reportTypeU8] || "OTHER";

      if (!reportId || !solarSystemId || !author || !txDigest) {
        skipped.push({ tx_digest: txDigest || "unknown", reason: "missing required event fields" });
        continue;
      }

      const existing = await prisma.intelReport.findFirst({
        where: { tx_digest: txDigest },
        select: { id: true },
      });

      if (existing) {
        skipped.push({ tx_digest: txDigest, reason: "already indexed" });
        continue;
      }

      const message = await getReportMessage(reportId);
      const createdAt = timestampMs > 0 ? new Date(timestampMs) : new Date();
      const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

      await prisma.intelReport.create({
        data: {
          solar_system_id: solarSystemId,
          message,
          wallet_address: author,
          report_type: reportType,
          signature: txDigest,
          tx_digest: txDigest,
          on_chain_report_id: reportId,
          created_at: createdAt,
          expires_at: expiresAt,
        },
      });

      synced.push({ tx_digest: txDigest, report_id: reportId });
    }

    return res.json({
      synced_count: synced.length,
      skipped_count: skipped.length,
      synced,
      skipped,
      next_cursor: eventsPage.nextCursor ?? null,
      has_next_page: Boolean(eventsPage.hasNextPage),
      source_event_type: eventType,
      rpc_url: getSuiRpcUrl(),
    });
  } catch (err) {
    console.error("[intel] sync-onchain error:", err);
    return res.status(500).json({ error: "Failed to sync on-chain intel reports" });
  }
});

router.delete("/intel/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const deleted = await prisma.intelReport.deleteMany({
      where: { id },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: "Intel report not found" });
    }

    return res.json({ success: true, message: "Intel report deleted" });
  } catch (err) {
    console.error("[intel] delete error:", err);
    return res.status(500).json({ error: "Failed to delete intel report" });
  }
});

export default router;
