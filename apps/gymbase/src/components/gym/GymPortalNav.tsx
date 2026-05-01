// GymPortalNav.tsx — Top navbar del portal del miembro: dark, con nav links y logout

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  CalendarDays,
  Trophy,
  TrendingUp,
  BookOpen,
  Users,
  ShoppingBag,
  LogOut,
  UserCircle,
  Zap,
  ChevronDown,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { themeConfig } from "@/lib/theme";
import { signOut } from "@core/actions/auth.actions";
import type { Profile } from "@/types/database";

interface GymPortalNavProps {
  profile: Profile | null;
  // Cuando la membresía no está activa, solo se muestra el link de membresía
  isActive?: boolean;
  // Nombre del gym desde la DB — sobreescribe themeConfig.brand.name si se provee
  gymName?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  flag?: keyof typeof themeConfig.features;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/portal/dashboard",  label: "Inicio",    icon: LayoutDashboard },
  { href: "/portal/content",    label: "Contenido", icon: BookOpen },
  { href: "/portal/routines",   label: "Rutinas",   icon: Dumbbell,     flag: "gym_routines" },
  { href: "/portal/calendar",   label: "Clases",    icon: CalendarDays, flag: "gym_calendar" },
  { href: "/portal/challenges", label: "Retos",     icon: Trophy,       flag: "gym_challenges" },
  { href: "/portal/progress",  label: "Progreso",  icon: TrendingUp,   flag: "gym_health_metrics" },
  { href: "/portal/community",  label: "Comunidad", icon: Users,        flag: "community" },
  { href: "/portal/store",      label: "Tienda",    icon: ShoppingBag,  flag: "gym_marketplace" },
];

export function GymPortalNav({ profile, isActive = true, gymName }: GymPortalNavProps): React.ReactNode {
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar el menú de usuario si se hace click fuera de él
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determina si un link de navegación está activo según el pathname actual
  const isActivePath = (href: string): boolean => {
    if (href === "/portal/dashboard") return pathname === "/portal/dashboard" || pathname === "/portal";
    return pathname.startsWith(href);
  };

  // Sin membresía activa solo se muestra el link de membresía — el resto se oculta
  const visibleItems = isActive
    ? NAV_ITEMS.filter((item) => !item.flag || themeConfig.features[item.flag])
    : [];

  const firstName = profile?.full_name?.split(" ")[0] ?? profile?.email ?? "Mi cuenta";

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-16"
      style={{
        backgroundColor: "var(--gym-bg-surface)",
        borderBottom: "1px solid var(--gym-border)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-full flex items-center gap-6">

        {/* ── Logo ─────────────────────────────────────────────────────────── */}
        <Link href="/portal/dashboard" className="flex items-center gap-2 shrink-0 mr-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "#FF5E14" }}
          >
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span
            className="text-sm font-bold hidden sm:block"
            style={{ color: "var(--gym-text-primary)", fontFamily: "var(--font-barlow)" }}
          >
            {gymName ?? themeConfig.brand.name}
          </span>
        </Link>

        {/* ── Links de navegación ──────────────────────────────────────────── */}
        {/* En mobile los links se ocultan — la navegación va en el bottom nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {visibleItems.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                  active
                    ? "text-[#FF5E14] bg-[#FF5E1415]"
                    : "hover:bg-[#1A1A1A]"
                )}
                style={{ color: active ? "#FF5E14" : "var(--gym-text-muted)" }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden md:block">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ── Menú de usuario ──────────────────────────────────────────────── */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
            style={{
              backgroundColor: userMenuOpen ? "var(--gym-bg-elevated)" : "transparent",
              color: "var(--gym-text-secondary)",
            }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: "rgba(255,94,20,0.15)", color: "#FF5E14" }}
            >
              {firstName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium hidden sm:block" style={{ color: "var(--gym-text-secondary)" }}>
              {firstName}
            </span>
            <ChevronDown
              className={cn("w-3 h-3 transition-transform duration-150 hidden sm:block", userMenuOpen && "rotate-180")}
              style={{ color: "var(--gym-text-ghost)" }}
            />
          </button>

          {/* Dropdown del usuario */}
          {userMenuOpen && (
            <div
              className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden shadow-xl"
              style={{
                backgroundColor: "var(--gym-bg-elevated)",
                border: "1px solid var(--gym-border-md)",
              }}
            >
              {/* Info del usuario */}
              <div
                className="px-3 py-3"
                style={{ borderBottom: "1px solid var(--gym-border)" }}
              >
                <p className="text-xs font-semibold truncate" style={{ color: "var(--gym-text-primary)" }}>
                  {profile?.full_name ?? "—"}
                </p>
                <p className="text-[10px] truncate mt-0.5" style={{ color: "var(--gym-text-muted)" }}>
                  {profile?.email}
                </p>
              </div>

              {/* Link a perfil */}
              <Link
                href="/portal/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-medium transition-colors"
                style={{ color: "var(--gym-text-secondary)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--gym-bg-hover)";
                  (e.currentTarget as HTMLElement).style.color = "var(--gym-text-primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--gym-text-secondary)";
                }}
              >
                <UserCircle className="w-3.5 h-3.5" />
                Mi perfil
              </Link>

              {/* Cerrar sesión */}
              <form action={signOut} style={{ borderTop: "1px solid var(--gym-border)" }}>
                <button
                  type="submit"
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-medium transition-colors"
                  style={{ color: "var(--gym-danger)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239,68,68,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  }}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Cerrar sesión
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
