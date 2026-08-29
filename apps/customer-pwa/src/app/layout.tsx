import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "F&B Customer PWA",
  description: "Đặt món và Thanh toán dễ dàng",
};

import { ToastProvider } from "../components/ToastProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet" />
      </head>
      <body
        className="font-sans bg-[var(--color-brand-neutral)] text-[#333] antialiased"
      >
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
