import { authProxyRequest, authProxyResponse } from "@/lib/server/auth-proxy";
import type { SettingsStatus } from "@/lib/types";

export async function GET() {
  const result = await authProxyRequest<SettingsStatus>({
    path: "/settings/status/",
    method: "GET",
  });
  return authProxyResponse(result);
}
