import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import "../styles/extra.css";

export const metadata: Metadata = {
  title: "BU Lost & Found",
  description: "Campus lost and found platform powered by Next.js + Supabase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
