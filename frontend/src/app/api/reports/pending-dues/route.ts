import { NextRequest } from "next/server";

import { authProxyRequest, authProxyResponse } from "@/lib/server/auth-proxy";
import type { PendingDuesReport } from "@/lib/types";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.toString();
  const path = search ? `/reports/pending-dues/?${search}` : "/reports/pending-dues/";
  const result = await authProxyRequest<PendingDuesReport>({
    path,
    method: "GET",
  });
  return authProxyResponse(result);
}
