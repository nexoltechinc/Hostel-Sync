export const ACCESS_COOKIE = "ohm_access";
export const REFRESH_COOKIE = "ohm_refresh";

export const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 30;
export const REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const LOCAL_API_HOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i;

export function shouldUseSecureAuthCookies() {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const apiBaseUrl = process.env.DJANGO_API_BASE_URL ?? "";
  return !LOCAL_API_HOST_PATTERN.test(apiBaseUrl);
}
