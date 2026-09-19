import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARSAVAYA PMS | Manajemen Properti",
  description: "Reservasi dan operasional delapan vila.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.png",
    apple: "/apple-icon.png",
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

