import { NextRequest } from "next/server";

import { authProxyRequest, authProxyResponse } from "@/lib/server/auth-proxy";
import type { OccupancyReport } from "@/lib/types";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.toString();
  const path = search ? `/reports/occupancy/?${search}` : "/reports/occupancy/";
  const result = await authProxyRequest<OccupancyReport>({
    path,
    method: "GET",
  });
  return authProxyResponse(result);
}
