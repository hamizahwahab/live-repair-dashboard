import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dashboard 4 — Live Repair Tracking Board",
  description: "DJI Agriculture drone repair tracking board — Bagan Serai",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden bg-tv-bg text-tv-text font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
