import type { AuthResponse, AuthUser } from "./types";

type WebRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

async function webRequest<T>(path: string, options: WebRequestOptions = {}) {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    credentials: "include",
  });

  const payload = (await response.json().catch(() => null)) as T | { detail?: string } | null;
  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? (payload as { detail?: string }).detail
        : "Request failed";
    throw new Error(detail || "Request failed");
  }
  return payload as T;
}

export function login(payload: { username: string; password: string }) {
  return webRequest<AuthResponse>("/api/auth/login", { method: "POST", body: payload });
}

export function logout() {
  return webRequest<{ success: boolean }>("/api/auth/logout", { method: "POST" });
}

export function getSession() {
  return webRequest<{ user: AuthUser }>("/api/auth/session");
}
