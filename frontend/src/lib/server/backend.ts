export const DJANGO_API_BASE_URL = process.env.DJANGO_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

type BackendErrorPayload = {
  detail?: string;
};

type BackendRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  accessToken?: string;
  body?: unknown;
};

export async function backendRequest<T>(path: string, options: BackendRequestOptions = {}) {
  const { method = "GET", accessToken, body } = options;
  try {
    const response = await fetch(`${DJANGO_API_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    let payload: T | BackendErrorPayload | undefined;
    try {
      payload = (await response.json()) as T;
    } catch {
      payload = undefined;
    }

    return { response, payload };
  } catch (error) {
    const payload: BackendErrorPayload = {
      detail:
        process.env.NODE_ENV === "development"
          ? `Unable to reach the Django API at ${DJANGO_API_BASE_URL}. Start the backend server and try again.`
          : "The backend service is unavailable. Please try again.",
    };

    if (process.env.NODE_ENV !== "production") {
      console.error("backendRequest failed", error);
    }

    const response = new Response(JSON.stringify(payload), {
      status: 503,
      headers: {
        "Content-Type": "application/json",
      },
    });

    return { response, payload };
  }
}
