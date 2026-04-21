export type ThemeMode = "dark" | "light";

export const THEME_STORAGE_KEY = "hostel-app-theme";
export const THEME_COOKIE_NAME = "hostel-app-theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function normalizeTheme(value: string | null | undefined): ThemeMode {
  return value === "light" ? "light" : "dark";
}
