import { useCallback } from "react";
import { apiUrl, getApiErrorMessage } from "@/lib/api";

export function useAdminFetch(token: string | null) {
  return useCallback(async (path: string, options?: RequestInit) => {
    const res = await fetch(apiUrl(path), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {}),
      },
    });
    if (!res.ok) {
      throw new Error(`${res.status}: ${await getApiErrorMessage(res, "Request failed. Please try again.")}`);
    }
    return res.json();
  }, [token]);
}