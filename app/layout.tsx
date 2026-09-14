import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vila Eight | Manajemen Properti",
  description: "Reservasi dan operasional delapan vila.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}

