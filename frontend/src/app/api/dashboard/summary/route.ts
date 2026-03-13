import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/auth/constants";
import { backendRequest } from "@/lib/server/backend";
import type { DashboardSummary } from "@/lib/types";

async function fetchDashboardSummary(accessToken: string) {
  return backendRequest<DashboardSummary>("/reports/dashboard-summary/", {
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
    const summary = await fetchDashboardSummary(accessToken);
    if (summary.response.ok) {
      return NextResponse.json(summary.payload);
    }

    if (summary.response.status !== 401) {
      const detail = (summary.payload as { detail?: string } | undefined)?.detail ?? "Request failed";
      return NextResponse.json({ detail }, { status: summary.response.status || 500 });
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
  const summary = await fetchDashboardSummary(newAccess);

  if (!summary.response.ok) {
    const detail = (summary.payload as { detail?: string } | undefined)?.detail ?? "Request failed";
    const failure = NextResponse.json({ detail }, { status: summary.response.status || 500 });
    failure.cookies.set(ACCESS_COOKIE, newAccess, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
    });
    failure.cookies.set(REFRESH_COOKIE, newRefresh, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
    });
    return failure;
  }

  const success = NextResponse.json(summary.payload);
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
