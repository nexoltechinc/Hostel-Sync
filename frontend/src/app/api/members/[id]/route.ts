import { NextRequest, NextResponse } from "next/server";

import { authProxyRequest, authProxyResponse } from "@/lib/server/auth-proxy";
import type { Member } from "@/lib/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function resolveMemberId(context: RouteContext) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) {
    return null;
  }
  return id;
}

export async function GET(_: NextRequest, context: RouteContext) {
  const memberId = await resolveMemberId(context);
  if (!memberId) {
    return NextResponse.json({ detail: "Invalid member id." }, { status: 400 });
  }

  const result = await authProxyRequest<Member>({
    path: `/members/${memberId}/`,
    method: "GET",
  });
  return authProxyResponse(result);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const memberId = await resolveMemberId(context);
  if (!memberId) {
    return NextResponse.json({ detail: "Invalid member id." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ detail: "Invalid request payload." }, { status: 400 });
  }

  const result = await authProxyRequest<Member>({
    path: `/members/${memberId}/`,
    method: "PATCH",
    body,
  });
  return authProxyResponse(result);
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  const memberId = await resolveMemberId(context);
  if (!memberId) {
    return NextResponse.json({ detail: "Invalid member id." }, { status: 400 });
  }

  const result = await authProxyRequest<null>({
    path: `/members/${memberId}/`,
    method: "DELETE",
  });
  return authProxyResponse(result);
}
