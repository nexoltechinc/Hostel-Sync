import { NextRequest, NextResponse } from "next/server";

import { authProxyRequest, authProxyResponse } from "@/lib/server/auth-proxy";
import type { Bed, BedWritePayload, PaginatedResponse } from "@/lib/types";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.toString();
  const path = search ? `/rooms/beds/?${search}` : "/rooms/beds/";
  const result = await authProxyRequest<PaginatedResponse<Bed>>({
    path,
    method: "GET",
  });
  return authProxyResponse(result);
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as BedWritePayload | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ detail: "Invalid request payload." }, { status: 400 });
  }

  const result = await authProxyRequest<Bed>({
    path: "/rooms/beds/",
    method: "POST",
    body,
  });
  return authProxyResponse(result);
}
