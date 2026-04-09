const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

const LOCAL_ROUTES = ["/api/render"];

function isLocal(path: string): boolean {
  return LOCAL_ROUTES.some((r) => path.startsWith(r));
}

export function apiUrl(path: string): string {
  if (!API_BASE || isLocal(path)) return path;
  return API_BASE + path;
}

let _getToken: (() => Promise<string | null>) | null = null;

export function setTokenGetter(fn: () => Promise<string | null>) {
  _getToken = fn;
}

export async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const base = isLocal(path) ? "" : API_BASE;
  const url = base + path;

  if (base) {
    const token = _getToken ? await _getToken() : null;
    const headers = new Headers(init?.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...init, headers, credentials: "omit" });
  }

  return fetch(url, init);
}
