import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import { AppFeedbackProvider } from "@/components/providers/app-feedback-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Smart HR — Workforce Management",
  description: "Complete HR software dashboard for HR teams and office staff",
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
        <ToastProvider />
      </body>
    </html>
  );
}
