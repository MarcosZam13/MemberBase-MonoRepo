// layout.tsx — Layout para las páginas de autenticación (login, register)
// Centra el contenido verticalmente con el branding de la marca

import { themeConfig } from "@/lib/theme";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[--color-surface,#F9FAFB] px-4">
      {/* Logo y nombre de la marca — bloque navy como en el diseño de Figma */}
      <div className="mb-8 text-center">
        <div className="inline-block bg-[#1E3A5F] text-white px-6 py-3 rounded-lg mb-3">
          <span className="text-2xl font-bold">{themeConfig.brand.name}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {themeConfig.brand.tagline}
        </p>
      </div>
      {children}
    </div>
  );
}
