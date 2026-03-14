import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "One Hostel Manager",
  description: "Hostel operations dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
