"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";

import {
  normalizeTheme,
  THEME_COOKIE_MAX_AGE,
  THEME_COOKIE_NAME,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from "@/lib/theme";

const THEME_CHANGE_EVENT = "hostel-theme-change";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function writeThemeCookie(theme: ThemeMode) {
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
}

function persistTheme(theme: ThemeMode) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage access issues and still persist the server-readable cookie.
  }

  writeThemeCookie(theme);
}

function readStoredThemePreference(): ThemeMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (!storedTheme) {
      return null;
    }
    return normalizeTheme(storedTheme);
  } catch {
    return null;
  }
}

function getThemeSnapshot(fallbackTheme: ThemeMode): ThemeMode {
  if (typeof document !== "undefined") {
    const domTheme = document.documentElement.dataset.theme;
    if (domTheme === "light" || domTheme === "dark") {
      return domTheme;
    }
  }

  if (typeof window !== "undefined") {
    return readStoredThemePreference() ?? fallbackTheme;
  }

  return fallbackTheme;
}

function subscribeToTheme(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key && event.key !== THEME_STORAGE_KEY) {
      return;
    }

    const currentTheme = normalizeTheme(document.documentElement.dataset.theme);
    const nextTheme = readStoredThemePreference() ?? currentTheme;
    applyTheme(nextTheme);
    onStoreChange();
  };

  const handleThemeChange = () => {
    onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  };
}

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: ReactNode;
  initialTheme: ThemeMode;
}) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    () => getThemeSnapshot(initialTheme),
    () => initialTheme,
  );

  useEffect(() => {
    applyTheme(theme);

    const storedTheme = readStoredThemePreference();
    if (storedTheme && storedTheme !== theme) {
      applyTheme(storedTheme);
      persistTheme(storedTheme);
      window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
      return;
    }

    persistTheme(theme);
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    applyTheme(nextTheme);
    persistTheme(nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [setTheme, theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }

  return context;
}
