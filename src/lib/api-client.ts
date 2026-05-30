// Typed fetch wrapper for /api/v1/* routes.
// - Attaches Authorization header automatically.
// - Redirects to /signin on 401.
// - Throws Error with server message on non-2xx.

const BASE = "/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

interface ApiFetchOptions extends Omit<RequestInit, "headers"> {
  /** Pass false to skip Authorization header (e.g. action-sessions). Default true. */
  auth?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { auth = true, body, ...rest } = options;

  const headers: Record<string, string> = {};
  if (body && typeof body === "string") {
    headers["Content-Type"] = "application/json";
  }
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...rest, headers, body });

  if (res.status === 401) {
    localStorage.removeItem("auth_token");
    window.location.href = "/signin";
    throw new Error("UNAUTHORIZED");
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json();

  if (!res.ok) {
    const msg =
      data?.error?.message ?? data?.error ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }

  // All API responses are wrapped as { data: T } by the ok() / created() helpers.
  // Unwrap automatically so callers receive T directly.
  return (data?.data ?? data) as T;
}
