// Re-export types from generated Prisma client

export type TelemetryKillCreate = {
  tx_digest: string;
  event_seq: string;
  killmail_id: string;
  killer_character_id: string;
  victim_character_id: string;
  solar_system_id: string;
  loss_type?: string;
  event_timestamp: Date;
};
