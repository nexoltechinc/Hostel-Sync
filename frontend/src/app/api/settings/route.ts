import { NextRequest, NextResponse } from "next/server";

import { authProxyRequest, authProxyResponse } from "@/lib/server/auth-proxy";
import type { SettingsSnapshot } from "@/lib/types";

export async function GET() {
  const result = await authProxyRequest<SettingsSnapshot>({
    path: "/settings/current/",
    method: "GET",
  });
  return authProxyResponse(result);
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ detail: "Invalid request payload." }, { status: 400 });
  }

  const result = await authProxyRequest<SettingsSnapshot>({
    path: "/settings/current/",
    method: "PATCH",
    body,
  });
  return authProxyResponse(result);
}
