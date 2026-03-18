import { pgTable, serial, text, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";

export const telemetryAssembliesTable = pgTable(
  "telemetry_assemblies",
  {
    id: serial("id").primaryKey(),
    assembly_id: text("assembly_id").notNull(),
    solar_system_id: text("solar_system_id").notNull(),
    owner_character_id: text("owner_character_id").notNull(),
    assembly_type: text("assembly_type").notNull().default("UNKNOWN"),
    is_online: boolean("is_online").notNull().default(false),
    name: text("name").notNull().default("Unknown Assembly"),
    tx_digest: text("tx_digest").notNull(),
    event_seq: text("event_seq").notNull(),
    event_timestamp: timestamp("event_timestamp").notNull(),
    indexed_at: timestamp("indexed_at").defaultNow().notNull(),
  },
  (table) => ({
    assemblyUnique: uniqueIndex("telemetry_assemblies_assembly_unique").on(
      table.assembly_id,
    ),
  }),
);
