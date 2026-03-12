import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/auth/constants";
import { backendRequest } from "@/lib/server/backend";
import type { AuthUser } from "@/lib/types";

async function fetchProfile(accessToken: string) {
  return backendRequest<AuthUser>("/auth/me/profile/", {
    method: "GET",
    accessToken,
  });
}

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  if (accessToken) {
    const { response, payload } = await fetchProfile(accessToken);
    if (response.ok) {
      return NextResponse.json({ user: payload });
    }
  }

  if (!refreshToken) {
    const unauthorized = NextResponse.json({ detail: "Session expired" }, { status: 401 });
    unauthorized.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
    unauthorized.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
    return unauthorized;
  }

  const refresh = await backendRequest<{ access: string; refresh?: string; detail?: string }>("/auth/refresh/", {
    method: "POST",
    body: { refresh: refreshToken },
  });

  if (!refresh.response.ok || !refresh.payload || !("access" in refresh.payload)) {
    const unauthorized = NextResponse.json({ detail: "Session expired" }, { status: 401 });
    unauthorized.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
    unauthorized.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
    return unauthorized;
  }

  const newAccess = refresh.payload.access;
  const newRefresh = refresh.payload.refresh ?? refreshToken;
  const profile = await fetchProfile(newAccess);

  if (!profile.response.ok) {
    const unauthorized = NextResponse.json({ detail: "Session expired" }, { status: 401 });
    unauthorized.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
    unauthorized.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
    return unauthorized;
  }

  const success = NextResponse.json({ user: profile.payload });
  success.cookies.set(ACCESS_COOKIE, newAccess, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
  });
  success.cookies.set(REFRESH_COOKIE, newRefresh, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  });
  return success;
}
