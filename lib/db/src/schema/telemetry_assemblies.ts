// Re-export types from generated Prisma client

export type TelemetryAssemblyCreate = {
  assembly_id: string;
  solar_system_id: string;
  owner_character_id: string;
  assembly_type?: string;
  is_online?: boolean;
  name?: string;
  tx_digest: string;
  event_seq: string;
  event_timestamp: Date;
};
