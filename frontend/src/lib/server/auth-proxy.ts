import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/auth/constants";
import { backendRequest } from "@/lib/server/backend";

type BackendMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type AuthProxyRequestOptions = {
  path: string;
  method?: BackendMethod;
  body?: unknown;
};

type AuthProxyResult<T> = {
  status: number;
  payload: T | { detail?: string } | null;
  setCookies?: {
    access: string;
    refresh: string;
  };
  clearCookies?: boolean;
};

async function callProtectedEndpoint<T>(path: string, method: BackendMethod, accessToken: string, body?: unknown) {
  return backendRequest<T | { detail?: string }>(path, {
    method,
    accessToken,
    body,
  });
}

export async function authProxyRequest<T>(options: AuthProxyRequestOptions): Promise<AuthProxyResult<T>> {
  const { path, method = "GET", body } = options;
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!accessToken && !refreshToken) {
    return {
      status: 401,
      payload: { detail: "Not authenticated" },
    };
  }

  if (accessToken) {
    const initial = await callProtectedEndpoint<T>(path, method, accessToken, body);
    if (initial.response.ok || initial.response.status !== 401 || !refreshToken) {
      return {
        status: initial.response.status,
        payload: (initial.payload ?? null) as T | { detail?: string } | null,
      };
    }
  }

  if (!refreshToken) {
    return {
      status: 401,
      payload: { detail: "Session expired" },
      clearCookies: true,
    };
  }

  const refresh = await backendRequest<{ access: string; refresh?: string; detail?: string }>("/auth/refresh/", {
    method: "POST",
    body: { refresh: refreshToken },
  });

  if (!refresh.response.ok || !refresh.payload || !("access" in refresh.payload)) {
    return {
      status: 401,
      payload: { detail: "Session expired" },
      clearCookies: true,
    };
  }

  const newAccess = refresh.payload.access;
  const newRefresh = refresh.payload.refresh ?? refreshToken;
  const retried = await callProtectedEndpoint<T>(path, method, newAccess, body);

  return {
    status: retried.response.status,
    payload: (retried.payload ?? null) as T | { detail?: string } | null,
    setCookies: {
      access: newAccess,
      refresh: newRefresh,
    },
  };
}

function applyCookieUpdates<T>(response: NextResponse, result: AuthProxyResult<T>) {
  if (result.clearCookies) {
    response.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
    response.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
    return;
  }

  if (!result.setCookies) {
    return;
  }

  response.cookies.set(ACCESS_COOKIE, result.setCookies.access, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
  });
  response.cookies.set(REFRESH_COOKIE, result.setCookies.refresh, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  });
}

export function authProxyResponse<T>(result: AuthProxyResult<T>) {
  const isNoContent = result.status === 204;
  const response = isNoContent
    ? new NextResponse(null, { status: 204 })
    : NextResponse.json(result.payload, { status: result.status });

  applyCookieUpdates(response, result);
  return response;
}
