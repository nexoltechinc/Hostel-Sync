import { NextRequest, NextResponse } from "next/server";

import { authProxyRequest, authProxyResponse } from "@/lib/server/auth-proxy";
import type { Room, RoomUpdatePayload } from "@/lib/types";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function resolveRoomId(context: RouteContext) {
  const { id } = await context.params;
  if (!/^\d+$/.test(id)) {
    return null;
  }
  return id;
}

export async function GET(_: NextRequest, context: RouteContext) {
  const roomId = await resolveRoomId(context);
  if (!roomId) {
    return NextResponse.json({ detail: "Invalid room id." }, { status: 400 });
  }

  const result = await authProxyRequest<Room>({
    path: `/rooms/${roomId}/`,
    method: "GET",
  });
  return authProxyResponse(result);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const roomId = await resolveRoomId(context);
  if (!roomId) {
    return NextResponse.json({ detail: "Invalid room id." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as RoomUpdatePayload | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ detail: "Invalid request payload." }, { status: 400 });
  }

  const result = await authProxyRequest<Room>({
    path: `/rooms/${roomId}/`,
    method: "PATCH",
    body,
  });
  return authProxyResponse(result);
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  const roomId = await resolveRoomId(context);
  if (!roomId) {
    return NextResponse.json({ detail: "Invalid room id." }, { status: 400 });
  }

  const result = await authProxyRequest<null>({
    path: `/rooms/${roomId}/`,
    method: "DELETE",
  });
  return authProxyResponse(result);
}
