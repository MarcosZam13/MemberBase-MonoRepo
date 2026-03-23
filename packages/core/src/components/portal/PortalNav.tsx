// PortalNav.tsx — Barra de navegación superior del portal del cliente

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CreditCard, BookOpen, UserCircle, LogOut, Menu, X, Users } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { themeConfig } from "@/lib/theme";
import { signOut } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/types/database";

interface PortalNavProps {
  profile: Profile | null;
}

// Los items de navegación se filtran según los feature flags del cliente
const BASE_NAV_ITEMS = [
  { href: "/portal/dashboard",  label: "Inicio",       icon: LayoutDashboard, flag: null },
  { href: "/portal/plans",      label: "Planes",       icon: CreditCard,      flag: null },
  { href: "/portal/membership", label: "Mi Membresía", icon: UserCircle,      flag: null },
  { href: "/portal/content",    label: "Contenido",    icon: BookOpen,        flag: null },
  { href: "/portal/community",  label: "Comunidad",    icon: Users,           flag: "community" as const },
] satisfies Array<{ href: string; label: string; icon: typeof LayoutDashboard; flag: keyof typeof themeConfig.features | null }>;

// Filtrar items según feature flags activos en la configuración del cliente
const NAV_ITEMS = BASE_NAV_ITEMS.filter(
  (item) => item.flag === null || themeConfig.features[item.flag]
);

export function PortalNav({ profile }: PortalNavProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string): boolean => pathname.startsWith(href);

  return (
    <header className="bg-primary text-primary-foreground shadow-sm sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/portal/dashboard" className="font-bold text-lg">
            {themeConfig.brand.name}
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive(href)
                    ? "bg-white/20"
                    : "hover:bg-white/10"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* User + logout desktop */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-sm opacity-80">
              {profile?.full_name ?? profile?.email}
            </span>
            <form action={signOut}>
              <Button
                type="submit"
                size="sm"
                variant="ghost"
                className="text-primary-foreground hover:bg-white/20 gap-2"
              >
                <LogOut className="w-4 h-4" />
                Salir
              </Button>
            </form>
          </div>

          {/* Botón hamburguesa móvil */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Abrir menú"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Nav móvil */}
        {mobileOpen && (
          <div className="md:hidden pb-3 space-y-1 border-t border-white/20 pt-2">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                  isActive(href) ? "bg-white/20" : "hover:bg-white/10"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            <form action={signOut}>
              <button className="flex items-center gap-2 px-3 py-2 text-sm w-full hover:bg-white/10 rounded-md">
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
