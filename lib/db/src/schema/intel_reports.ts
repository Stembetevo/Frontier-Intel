// Re-export types from generated Prisma client  
export type { IntelReport } from "@prisma/client";

// Type for inserting new intel reports
export type InsertIntelReport = {
  solar_system_id: string;
  message: string;
  wallet_address: string;
  report_type?: string;
  signature?: string | null;
  tx_digest?: string | null;
  on_chain_report_id?: string | null;
  expires_at?: Date | null;
};
