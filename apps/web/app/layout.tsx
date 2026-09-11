import type { Metadata } from "next";
import type { ReactNode } from "react";

import { LocaleProvider } from "../src/components/i18n/locale-provider";
import { ToastProvider } from "../src/components/ui/toast";

import "@fontsource-variable/nunito";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pigverse",
  description: "Ten unique pig characters. One connected universe.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="vi">
      <body>
        <a className="pv-skip-link" href="#main-content">
          Skip to content
        </a>
        <LocaleProvider>
          <ToastProvider>{children}</ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
