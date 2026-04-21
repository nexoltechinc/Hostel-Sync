import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

import { normalizeTheme, THEME_COOKIE_NAME } from "@/lib/theme";
import { ThemeProvider } from "@/providers/theme-provider";

export const metadata: Metadata = {
  title: "Hostel Sync",
  description: "Hostel Sync operations dashboard",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialTheme = normalizeTheme(cookieStore.get(THEME_COOKIE_NAME)?.value);

  return (
    <html lang="en" data-theme={initialTheme} style={{ colorScheme: initialTheme }}>
      <body>
        <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
