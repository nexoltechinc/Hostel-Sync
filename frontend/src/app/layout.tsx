import type { Metadata } from "next";
import "./globals.css";

import { ThemeProvider } from "@/providers/theme-provider";

export const metadata: Metadata = {
  title: "Hostel Sync",
  description: "Hostel Sync operations dashboard",
};

const themeScript = `
  (function () {
    try {
      var storedTheme = window.localStorage.getItem("hostel-app-theme");
      var theme = storedTheme === "light" ? "light" : "dark";
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch (error) {
      document.documentElement.dataset.theme = "dark";
      document.documentElement.style.colorScheme = "dark";
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
