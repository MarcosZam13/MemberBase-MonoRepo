// layout.tsx — Root layout de GymBase: aplica tema dinámico desde DB, providers y fuentes

import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { DM_Sans, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@core/components/shared/QueryProvider";
import { Toaster } from "@core/components/ui/sonner";
import { themeConfig } from "@/lib/theme";
import { getOrgConfig } from "@/lib/get-org-config";
import { buildThemeVars } from "@/lib/theme-vars";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-barlow",
});

export const metadata: Metadata = {
  title: themeConfig.brand.name,
  description: themeConfig.brand.tagline,
  icons: {
    icon: themeConfig.brand.favicon,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Leer config del gym desde el header x-org-config (inyectado por middleware)
  const config = await getOrgConfig();

  return (
    <html
      lang="es"
      style={buildThemeVars(config) as CSSProperties}
      className={`${dmSans.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gym-base text-gym-text-primary">
        <QueryProvider>
          {children}
          <Toaster position="top-right" richColors />
        </QueryProvider>
      </body>
    </html>
  );
}
