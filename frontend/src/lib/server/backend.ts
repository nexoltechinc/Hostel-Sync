export const DJANGO_API_BASE_URL = process.env.DJANGO_API_BASE_URL ?? "http://localhost:8000/api/v1";

type BackendRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  accessToken?: string;
  body?: unknown;
};

export async function backendRequest<T>(path: string, options: BackendRequestOptions = {}) {
  const { method = "GET", accessToken, body } = options;
  const response = await fetch(`${DJANGO_API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  let payload: T | { detail?: string } | undefined;
  try {
    payload = (await response.json()) as T;
  } catch {
    payload = undefined;
  }

  return { response, payload };
}
