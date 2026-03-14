import { NextRequest } from "next/server";

import { authProxyRequest, authProxyResponse } from "@/lib/server/auth-proxy";
import type { FeeCollectionReport } from "@/lib/types";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.toString();
  const path = search ? `/reports/fee-collection/?${search}` : "/reports/fee-collection/";
  const result = await authProxyRequest<FeeCollectionReport>({
    path,
    method: "GET",
  });
  return authProxyResponse(result);
}
