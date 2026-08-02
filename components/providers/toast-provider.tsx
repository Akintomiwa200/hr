"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      expand={false}
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-xl border border-gray-100 shadow-lg font-sans text-sm",
          title: "font-semibold text-gray-900",
          description: "text-gray-600",
          actionButton: "bg-brand-500 text-white",
          cancelButton: "bg-gray-100 text-gray-700",
          closeButton:
            "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50",
        },
      }}
    />
  );
}
