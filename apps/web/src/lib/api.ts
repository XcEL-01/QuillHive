import { setAuthTokenGetter } from "@workspace/api-client-react";

const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const apiOrigin = configuredApiUrl || (import.meta.env.PROD ? "https://quillhive.onrender.com" : "");

export const API_BASE_URL = apiOrigin
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path) || !API_BASE_URL || !path.startsWith("/")) return path;
  return `${API_BASE_URL}${path}`;
}

export const TOKEN_KEY = "qh_token";
export const REFRESH_TOKEN_KEY = "qh_refresh_token";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setStoredRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

setAuthTokenGetter(getStoredToken);

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = getStoredToken();
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  return fetch(apiUrl(path), { ...options, headers, credentials: options.credentials ?? "include" });
}

export async function apiRequest(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  url: string,
  body?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getStoredToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(apiUrl(url), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (!res.ok && res.status >= 400) {
    let detail = "";
    try { detail = (await res.clone().json())?.error ?? ""; } catch {}
    if (detail) {
      const err = new Error(`${res.status}: ${detail}`);
      (err as any).status = res.status;
      throw err;
    }
  }
  return res;
}
