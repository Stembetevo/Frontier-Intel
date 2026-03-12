import { pgTable, text, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const intelReportsTable = pgTable("intel_reports", {
  id: serial("id").primaryKey(),
  solar_system_id: text("solar_system_id").notNull(),
  message: text("message").notNull(),
  wallet_address: varchar("wallet_address", { length: 255 }).notNull(),
  report_type: varchar("report_type", { length: 50 }).notNull().default("OTHER"),
  signature: text("signature"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  expires_at: timestamp("expires_at"),
});

export const insertIntelReportSchema = createInsertSchema(intelReportsTable).omit({
  id: true,
  created_at: true,
});

export type InsertIntelReport = z.infer<typeof insertIntelReportSchema>;
export type IntelReport = typeof intelReportsTable.$inferSelect;
