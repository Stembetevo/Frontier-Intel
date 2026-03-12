const GATEWAY_BASE = "https://blockchain-gateway-stillness.live.tech.evefrontier.com";
const WORLD_PACKAGE_ID = "0x2ff3e06b96eb830bdcffbc6cae9b8fe43f005c3b94cef05d9ec23057df16f107";

const CACHE_TTL = 30_000; // 30 seconds
const cache = new Map<string, { data: unknown; ts: number }>();

function fromCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) {
    return entry.data as T;
  }
  return null;
}

function toCache(key: string, data: unknown) {
  cache.set(key, { data, ts: Date.now() });
}

export async function gatewayFetch<T>(path: string): Promise<{ data: T | null; status: string }> {
  const cacheKey = path;
  const cached = fromCache<T>(cacheKey);
  if (cached) return { data: cached, status: "cached" };

  try {
    const url = `${GATEWAY_BASE}${path}`;
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[gateway] ${url} returned ${res.status}`);
      return { data: null, status: `error_${res.status}` };
    }

    const data = await res.json() as T;
    toCache(cacheKey, data);
    return { data, status: "ok" };
  } catch (err) {
    console.error("[gateway] fetch error:", err);
    return { data: null, status: "unreachable" };
  }
}

export { GATEWAY_BASE, WORLD_PACKAGE_ID };
