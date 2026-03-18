export type TelemetryCursor = {
  id: number;
  stream_key: string;
  cursor_json: string | null;
  updated_at: Date;
};

export type TelemetryCursorUpsert = {
  stream_key: string;
  cursor_json?: string | null;
  updated_at?: Date;
};
