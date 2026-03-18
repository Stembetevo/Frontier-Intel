import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const telemetryKillsTable = pgTable(
  "telemetry_kills",
  {
    id: serial("id").primaryKey(),
    tx_digest: text("tx_digest").notNull(),
    event_seq: text("event_seq").notNull(),
    killmail_id: text("killmail_id").notNull(),
    killer_character_id: text("killer_character_id").notNull(),
    victim_character_id: text("victim_character_id").notNull(),
    solar_system_id: text("solar_system_id").notNull(),
    loss_type: text("loss_type").notNull().default("SHIP"),
    event_timestamp: timestamp("event_timestamp").notNull(),
    indexed_at: timestamp("indexed_at").defaultNow().notNull(),
  },
  (table) => ({
    txEventUnique: uniqueIndex("telemetry_kills_tx_event_unique").on(
      table.tx_digest,
      table.event_seq,
    ),
  }),
);
