import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "../components/ToastProvider";
import { AuthProvider } from "../components/AuthProvider";

export const metadata: Metadata = {
  title: "F&B SaaS - Đặt Món & Đặt Bàn",
  description: "Hệ thống Đặt món và Thanh toán VietQR trực tuyến",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet" />
      </head>
      <body
        className="font-sans bg-[var(--color-brand-neutral)] text-[#333] antialiased"
      >
        <ToastProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
