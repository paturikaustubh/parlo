import { apiFetch } from "./api-client";

function buildParams(obj?: Record<string, unknown>): string {
  if (!obj) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "" && v !== "all") {
      p.set(k, String(v));
    }
  }
  return p.toString();
}

// SWR fetcher: key is [url] or [url, paramsObject]
export async function pageFetcher<T>([url, params]: [
  string,
  Record<string, unknown>?,
]): Promise<T> {
  const qs = buildParams(params);
  return apiFetch<T>(qs ? `${url}?${qs}` : url);
}
