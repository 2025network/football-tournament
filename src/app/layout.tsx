import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AfriKick | Africa Plays Here",
  description: "Create, join, and manage football tournaments built for African players, clubs, schools, communities, and football competitors.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
    ],
  },
  appleWebApp: {
    title: "AfriKick",
    capable: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

