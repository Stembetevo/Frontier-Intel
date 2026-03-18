// Re-export types from generated Prisma client

export type TelemetryJumpCreate = {
  tx_digest: string;
  event_seq: string;
  character_id: string;
  from_solar_system_id: string;
  to_solar_system_id: string;
  gate_id?: string | null;
  event_timestamp: Date;
};
