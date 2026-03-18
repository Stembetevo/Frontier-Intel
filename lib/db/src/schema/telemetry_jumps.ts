import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const telemetryJumpsTable = pgTable(
  "telemetry_jumps",
  {
    id: serial("id").primaryKey(),
    tx_digest: text("tx_digest").notNull(),
    event_seq: text("event_seq").notNull(),
    character_id: text("character_id").notNull(),
    from_solar_system_id: text("from_solar_system_id").notNull(),
    to_solar_system_id: text("to_solar_system_id").notNull(),
    gate_id: text("gate_id"),
    event_timestamp: timestamp("event_timestamp").notNull(),
    indexed_at: timestamp("indexed_at").defaultNow().notNull(),
  },
  (table) => ({
    txEventUnique: uniqueIndex("telemetry_jumps_tx_event_unique").on(
      table.tx_digest,
      table.event_seq,
    ),
  }),
);
