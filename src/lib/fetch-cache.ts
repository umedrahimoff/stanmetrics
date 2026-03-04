const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

export async function cachedFetch<T>(url: string): Promise<T> {
  const entry = cache.get(url) as CacheEntry<T> | undefined;
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) {
    return entry.data;
  }
  const res = await fetch(url);
  const data = (await res.json()) as T;
  cache.set(url, { data, ts: Date.now() });
  return data;
}

export function buildQueryString(params?: Record<string, string | number | string[] | undefined>) {
  if (!params || Object.keys(params).length === 0) return "";
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === "" || v === undefined || v === null) return;
    if (Array.isArray(v)) {
      if (v.length > 0) qs.set(k, v.join(","));
    } else {
      qs.set(k, String(v));
    }
  });
  return qs.toString();
}
