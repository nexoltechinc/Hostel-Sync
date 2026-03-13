import { NextRequest, NextResponse } from "next/server";

import { authProxyRequest, authProxyResponse } from "@/lib/server/auth-proxy";
import type { Member, PaginatedResponse } from "@/lib/types";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.toString();
  const path = search ? `/members/?${search}` : "/members/";
  const result = await authProxyRequest<PaginatedResponse<Member>>({
    path,
    method: "GET",
  });
  return authProxyResponse(result);
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ detail: "Invalid request payload." }, { status: 400 });
  }

  const result = await authProxyRequest<Member>({
    path: "/members/",
    method: "POST",
    body,
  });
  return authProxyResponse(result);
}
