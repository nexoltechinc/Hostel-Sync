import { NextRequest, NextResponse } from "next/server";

import { authProxyRequest, authProxyResponse } from "@/lib/server/auth-proxy";
import type { Bed, BedUpdatePayload } from "@/lib/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function resolveBedId(context: RouteContext) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) {
    return null;
  }
  return id;
}

export async function GET(_: NextRequest, context: RouteContext) {
  const bedId = await resolveBedId(context);
  if (!bedId) {
    return NextResponse.json({ detail: "Invalid bed id." }, { status: 400 });
  }

  const result = await authProxyRequest<Bed>({
    path: `/rooms/beds/${bedId}/`,
    method: "GET",
  });
  return authProxyResponse(result);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const bedId = await resolveBedId(context);
  if (!bedId) {
    return NextResponse.json({ detail: "Invalid bed id." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as BedUpdatePayload | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ detail: "Invalid request payload." }, { status: 400 });
  }

  const result = await authProxyRequest<Bed>({
    path: `/rooms/beds/${bedId}/`,
    method: "PATCH",
    body,
  });
  return authProxyResponse(result);
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  const bedId = await resolveBedId(context);
  if (!bedId) {
    return NextResponse.json({ detail: "Invalid bed id." }, { status: 400 });
  }

  const result = await authProxyRequest<null>({
    path: `/rooms/beds/${bedId}/`,
    method: "DELETE",
  });
  return authProxyResponse(result);
}
