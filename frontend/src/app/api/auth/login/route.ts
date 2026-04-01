import { NextRequest, NextResponse } from "next/server";

import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MAX_AGE_SECONDS,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE_SECONDS,
  shouldUseSecureAuthCookies,
} from "@/lib/auth/constants";
import { backendRequest } from "@/lib/server/backend";
import type { AuthResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  const secureCookies = shouldUseSecureAuthCookies();
  const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;
  if (!body?.username || !body?.password) {
    return NextResponse.json({ detail: "Username and password are required." }, { status: 400 });
  }

  const { response, payload } = await backendRequest<AuthResponse>("/auth/login/", {
    method: "POST",
    body,
  });

  if (!response.ok || !payload || !("access" in payload)) {
    const detail = (payload as { detail?: string } | undefined)?.detail ?? "Invalid credentials";
    return NextResponse.json({ detail }, { status: response.status || 401 });
  }

  const authPayload = payload as AuthResponse;
  const result = NextResponse.json(authPayload);
  result.cookies.set(ACCESS_COOKIE, authPayload.access, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies,
    path: "/",
    maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
  });
  result.cookies.set(REFRESH_COOKIE, authPayload.refresh, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies,
    path: "/",
    maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS,
  });
  return result;
}
