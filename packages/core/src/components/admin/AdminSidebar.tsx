// AdminSidebar.tsx — Barra lateral de navegación del panel de administración

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FileText,
  Settings,
  BookOpen,
  LogOut,
  Menu,
  X,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { themeConfig } from "@/lib/theme";
import { signOut } from "@/actions/auth.actions";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  flag?: keyof typeof themeConfig.features;
}

// Items base siempre visibles + items condicionales por feature flag
const ALL_NAV_ITEMS: NavItem[] = [
  { href: "/admin",           label: "Dashboard",     icon: LayoutDashboard },
  { href: "/admin/members",   label: "Miembros",      icon: Users },
  { href: "/admin/plans",     label: "Planes",        icon: CreditCard },
  { href: "/admin/payments",  label: "Pagos",         icon: FileText },
  { href: "/admin/content",   label: "Contenido",     icon: BookOpen },
  { href: "/admin/community", label: "Comunidad",     icon: MessageSquare, flag: "community" },
  { href: "/admin/settings",  label: "Configuración", icon: Settings },
];

// Filtrar según feature flags activos en la configuración del cliente
const NAV_ITEMS = ALL_NAV_ITEMS.filter(
  (item) => !item.flag || themeConfig.features[item.flag]
);

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string): boolean => {
    // El dashboard exacto solo cuando la ruta es /admin
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo / nombre del negocio */}
      <div className="px-6 py-5 border-b border-border">
        <span className="text-lg font-bold text-primary">
          {themeConfig.brand.name}
        </span>
        <p className="text-xs text-muted-foreground">Panel Admin</p>
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive(href)
                ? "bg-[#1E3A5F] text-white"
                : "text-[#6B7280] hover:bg-[#F9FAFB] hover:text-foreground"
            )}
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Botón de cerrar sesión */}
      <div className="px-4 py-4 border-t border-border">
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start gap-3 px-4 py-2.5 rounded-lg text-[#6B7280] hover:bg-[#F9FAFB] hover:text-foreground"
          >
            <LogOut className="w-5 h-5" />
            Cerrar sesión
          </Button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar para desktop */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 bg-card border-r border-border min-h-screen">
        {sidebarContent}
      </aside>

      {/* Botón hamburguesa para móvil */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-card border border-border rounded-md shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Abrir menú"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay + sidebar móvil */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
