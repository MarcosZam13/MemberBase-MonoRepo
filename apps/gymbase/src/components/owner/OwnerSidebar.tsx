// OwnerSidebar.tsx — Sidebar independiente del portal del owner con badge de rol

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Package,
  CalendarDays,
  ShieldCheck,
  LogOut,
  Settings,
  Paintbrush,
} from "lucide-react";
import { themeConfig } from "@/lib/theme";
import { signOut } from "@/actions/auth.actions";
import { useTransition } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/owner/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { href: "/owner/finances", label: "Finanzas", icon: <TrendingUp size={18} /> },
  { href: "/owner/members", label: "Membresías", icon: <Users size={18} /> },
  { href: "/owner/inventory", label: "Inventario", icon: <Package size={18} /> },
  { href: "/owner/attendance", label: "Asistencia", icon: <CalendarDays size={18} /> },
  { href: "/owner/settings/appearance", label: "Apariencia", icon: <Paintbrush size={18} /> },
  { href: "/admin/settings", label: "Configuración", icon: <Settings size={18} /> },
];

export function OwnerSidebar(): React.ReactElement {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function handleSignOut(): void {
    startTransition(async () => {
      await signOut();
    });
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-[#111111] border-r border-[#1E1E1E] flex flex-col h-screen sticky top-0">
      {/* Logo y badge de rol */}
      <div className="p-6 border-b border-[#1E1E1E]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-[#FF5E14] flex items-center justify-center">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <span className="font-barlow font-bold text-lg text-white tracking-wide uppercase">
            {themeConfig.brand.name}
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FF5E14]/15 text-[#FF5E14] text-xs font-semibold border border-[#FF5E14]/30">
          <ShieldCheck size={11} />
          Owner
        </span>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#FF5E14]/15 text-[#FF5E14] border border-[#FF5E14]/20"
                  : "text-[#737373] hover:text-white hover:bg-white/5",
              ].join(" ")}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer con acceso a admin y logout */}
      <div className="p-4 border-t border-[#1E1E1E] space-y-1">
        <Link
          href="/admin"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#737373] hover:text-white hover:bg-white/5 transition-colors"
        >
          <LayoutDashboard size={18} />
          Panel Admin
        </Link>
        <button
          onClick={handleSignOut}
          disabled={isPending}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#737373] hover:text-red-400 hover:bg-red-500/5 transition-colors disabled:opacity-50"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
