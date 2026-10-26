import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import { AppFeedbackProvider } from "@/components/providers/app-feedback-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { PwaProvider } from "@/components/providers/pwa-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Smart HR — Workforce Management",
  description: "Complete HR software dashboard for HR teams and office staff",
  applicationName: "Smart HR",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Smart HR",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#8B94F6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-full font-sans antialiased`}>
        <Suspense fallback={null}>
          <AppFeedbackProvider>{children}</AppFeedbackProvider>
        </Suspense>
        <PwaProvider />
        <ToastProvider />
      </body>
    </html>
  );
}
