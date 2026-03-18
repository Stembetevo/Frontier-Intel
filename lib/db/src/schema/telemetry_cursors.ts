import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const telemetryCursorsTable = pgTable(
  "telemetry_cursors",
  {
    id: serial("id").primaryKey(),
    stream_key: text("stream_key").notNull(),
    cursor_json: text("cursor_json"),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    streamKeyUnique: uniqueIndex("telemetry_cursors_stream_key_unique").on(
      table.stream_key,
    ),
  }),
);
