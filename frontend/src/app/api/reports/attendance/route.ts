import { NextRequest } from "next/server";

import { authProxyRequest, authProxyResponse } from "@/lib/server/auth-proxy";
import type { AttendanceReport } from "@/lib/types";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.toString();
  const path = search ? `/reports/attendance/?${search}` : "/reports/attendance/";
  const result = await authProxyRequest<AttendanceReport>({
    path,
    method: "GET",
  });
  return authProxyResponse(result);
}
