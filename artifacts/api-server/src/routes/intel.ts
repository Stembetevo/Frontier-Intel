import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { intelReportsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/intel", async (req, res) => {
  try {
    const solarSystemId = req.query.solar_system_id as string | undefined;

    let reports;
    if (solarSystemId) {
      reports = await db
        .select()
        .from(intelReportsTable)
        .where(eq(intelReportsTable.solar_system_id, solarSystemId))
        .orderBy(desc(intelReportsTable.created_at))
        .limit(50);
    } else {
      reports = await db
        .select()
        .from(intelReportsTable)
        .orderBy(desc(intelReportsTable.created_at))
        .limit(200);
    }

    const serialized = reports.map(r => ({
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
    const { solar_system_id, message, wallet_address, report_type, signature } = req.body;

    if (!solar_system_id || !message || !wallet_address || !report_type) {
      return res.status(400).json({ error: "Missing required fields: solar_system_id, message, wallet_address, report_type" });
    }

    const validTypes = ["FLEET_SPOTTED", "AMBUSH", "SAFE", "TRADE_ROUTE", "OTHER"];
    if (!validTypes.includes(report_type)) {
      return res.status(400).json({ error: `Invalid report_type. Must be one of: ${validTypes.join(", ")}` });
    }

    if (message.length > 500) {
      return res.status(400).json({ error: "Message too long (max 500 chars)" });
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const [created] = await db
      .insert(intelReportsTable)
      .values({
        solar_system_id,
        message: message.trim(),
        wallet_address,
        report_type,
        signature: signature || null,
        expires_at: expiresAt,
      })
      .returning();

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

router.delete("/intel/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const deleted = await db
      .delete(intelReportsTable)
      .where(eq(intelReportsTable.id, id))
      .returning();

    if (deleted.length === 0) {
      return res.status(404).json({ error: "Intel report not found" });
    }

    return res.json({ success: true, message: "Intel report deleted" });
  } catch (err) {
    console.error("[intel] delete error:", err);
    return res.status(500).json({ error: "Failed to delete intel report" });
  }
});

export default router;
