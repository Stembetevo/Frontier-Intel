const DEFAULT_MAINNET_RPC = "https://fullnode.mainnet.sui.io:443";

export type SuiEventId = {
  txDigest?: string;
  eventSeq?: string;
};

export type SuiEventEnvelope = {
  id?: SuiEventId;
  parsedJson?: Record<string, unknown>;
  timestampMs?: string;
};

export type SuiEventsPage = {
  data: SuiEventEnvelope[];
  nextCursor?: SuiEventId | null;
  hasNextPage?: boolean;
};

export function getSuiRpcUrl() {
  return (process.env.SUI_RPC_URL || DEFAULT_MAINNET_RPC).trim();
}

export async function suiRpcCall<T>(method: string, params: unknown[]) {
  const rpcUrl = getSuiRpcUrl();
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`Sui RPC ${method} failed with status ${response.status}`);
  }

  const data = (await response.json()) as { result?: T; error?: { message?: string } };
  if (data.error) {
    throw new Error(data.error.message || `Sui RPC ${method} returned an error`);
  }

  return data.result as T;
}

export function parseStringField(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "bytes" in value) {
    const bytes = (value as { bytes?: unknown }).bytes;
    if (typeof bytes === "string") return bytes;
  }
  return "";
}

export function parseNumberField(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function toIsoFromUnknownTimestamp(
  value: unknown,
  fallbackIso?: string,
): string {
  const fallback = fallbackIso || new Date().toISOString();
  if (typeof value === "string") {
    const maybeMs = Number(value);
    if (Number.isFinite(maybeMs) && maybeMs > 0) {
      return new Date(maybeMs).toISOString();
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return new Date(value).toISOString();
  }

  return fallback;
}
