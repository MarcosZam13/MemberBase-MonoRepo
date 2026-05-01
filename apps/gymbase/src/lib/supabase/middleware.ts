// middleware.ts — Middleware de autenticación, autorización y resolución de tenant para GymBase
// Extiende el core con soporte para el rol 'owner', la ruta /owner/* y resolución multi-tenant.

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { OrgConfig } from "@core/types/org-config";

// DEFAULT_ORG_CONFIG inline para evitar problemas de runtime en edge — mismos valores que en org-config.ts
const DEFAULT_CONFIG: OrgConfig = {
  colors: {
    primary: "#FF5E14",
    background: "#0A0A0A",
    surface: "#111111",
    border: "#1E1E1E",
    text: "#F5F5F5",
    textMuted: "#737373",
  },
  design: {
    preset: "bold",
    cardRadius: "14px",
    font: "dm-sans",
    headingFont: "barlow-condensed",
    shadow: "none",
  },
  media: { logoUrl: null, portalBgImage: null, faviconUrl: null },
  features: {
    community: true,
    content: true,
    gym_qr_checkin: true,
    gym_health_metrics: true,
    gym_routines: true,
    gym_progress: true,
    gym_calendar: true,
    gym_challenges: true,
    gym_marketplace: false,
  },
  gym: { name: "GymBase", timezone: "America/Costa_Rica", currency: "CRC", maxCapacity: 50 },
};

// Cache en memoria del proceso — evita queries a DB en cada request para datos que cambian rarísimo.
// En edge runtime persiste entre requests del mismo instance; en Node.js persiste por proceso.
// TTL del orgId: 5 min. TTL del config: 1 min (permite ver cambios de apariencia más rápido).
const orgCache = new Map<string, {
  orgId: string;
  config: OrgConfig;
  orgIdExpiresAt: number;
  configExpiresAt: number;
}>();
const ORG_ID_CACHE_TTL_MS = 5 * 60 * 1000;  // 5 minutos — los subdominios casi nunca cambian
const CONFIG_CACHE_TTL_MS  = 60 * 1000;      // 1 minuto — config cambia tras edición de apariencia

/**
 * Obtiene la configuración visual del gym desde la RPC get_org_config.
 * Si la RPC falla, retorna el DEFAULT_CONFIG para no bloquear el request.
 */
async function fetchOrgConfig(orgId: string): Promise<OrgConfig> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey   = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_org_config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ p_org_id: orgId }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === "object") {
        return { ...DEFAULT_CONFIG, ...data } as OrgConfig;
      }
    }
  } catch {
    // Si falla la fetch del config, usar el default — nunca bloquear el request
  }
  return DEFAULT_CONFIG;
}

/**
 * Resuelve el org_id y config a partir del hostname.
 * Cache: orgId (5 min), config (1 min). Para localhost/dev usa la env var.
 */
async function resolveOrg(
  hostname: string
): Promise<{ orgId: string; config: OrgConfig } | null> {
  const now    = Date.now();
  const cached = orgCache.get(hostname);

  // Si tanto el orgId como el config están frescos, retornar del cache
  if (cached && cached.orgIdExpiresAt > now && cached.configExpiresAt > now) {
    return { orgId: cached.orgId, config: cached.config };
  }

  let orgId: string | null = cached?.orgId ?? null;

  // Resolver orgId si no está cacheado o está vencido
  if (!orgId || !cached || cached.orgIdExpiresAt <= now) {
    if (
      hostname === "localhost" ||
      hostname.startsWith("localhost:") ||
      hostname.includes(".vercel.app") ||
      hostname.includes("127.0.0.1")
    ) {
      orgId = process.env.GYMBASE_ORG_ID ?? "00000000-0000-0000-0000-000000000001";
    } else {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const anonKey   = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/rpc/resolve_org_id`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
          },
          body: JSON.stringify({ p_hostname: hostname }),
        });
        if (res.ok) {
          const data = await res.json();
          orgId = typeof data === "string" ? data : null;
        }
      } catch {
        // Si falla la resolución del orgId, no bloquear — se tratará como gym no encontrado
        orgId = null;
      }
    }
  }

  if (!orgId) return null;

  // Obtener config (si el config del cache expiró o no existe)
  let config: OrgConfig =
    cached && cached.configExpiresAt > now ? cached.config : await fetchOrgConfig(orgId);

  orgCache.set(hostname, {
    orgId,
    config,
    orgIdExpiresAt: now + ORG_ID_CACHE_TTL_MS,
    configExpiresAt: now + CONFIG_CACHE_TTL_MS,
  });

  return { orgId, config };
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const hostname = request.headers.get("host") ?? "localhost";
  const path     = request.nextUrl.pathname;

  // 1. Resolver org desde el hostname (cache → RPC → env var)
  const org = await resolveOrg(hostname);

  // 2. Gym no encontrado → redirigir (el matcher ya excluye /gym-not-found)
  if (!org) {
    const url = request.nextUrl.clone();
    url.pathname = "/gym-not-found";
    return NextResponse.redirect(url);
  }

  // 3. Enriquecer headers del request con x-org-id y x-org-config
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-org-id", org.orgId);
  requestHeaders.set("x-org-config", JSON.stringify(org.config));

  // 4. Crear response inicial con los headers enriquecidos
  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  // 5. Crear cliente Supabase para autenticación
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Preservar requestHeaders (que ya tiene x-org-id y x-org-config) al recrear el response
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: getUser() verifica el token con el servidor — no usar getSession() aquí
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirect = (to: string): NextResponse => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    return NextResponse.redirect(url);
  };

  // Rutas protegidas sin sesión → login
  if (
    !user &&
    (path.startsWith("/admin") || path.startsWith("/portal") || path.startsWith("/owner"))
  ) {
    return redirect("/login");
  }

  if (user) {
    const isProtectedRoute =
      path.startsWith("/admin") ||
      path.startsWith("/portal") ||
      path.startsWith("/owner");

    // Obtener perfil para verificar rol y org_id en rutas que lo necesitan
    const needsProfileFetch =
      isProtectedRoute ||
      path === "/login" ||
      path === "/register";

    let role: string | null = null;
    let profileOrgId: string | null = null;

    if (needsProfileFetch) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, org_id")
        .eq("id", user.id)
        .single();
      role = profile?.role ?? null;
      profileOrgId = profile?.org_id ?? null;
    }

    // Bloquear acceso cruzado entre tenants: si el usuario pertenece a otro gym, cerrar sesión
    // profileOrgId === null se tolera (ej: usuarios Google OAuth sin org_id aún asignado)
    if (isProtectedRoute && profileOrgId && profileOrgId !== org.orgId) {
      await supabase.auth.signOut();
      const logoutRedirect = redirect("/login");
      // Propagar Set-Cookie del sign-out al redirect para que el browser limpie el token
      const setCookies: string[] = (supabaseResponse.headers as unknown as { getSetCookie?(): string[] }).getSetCookie?.() ?? [];
      setCookies.forEach(cookie => logoutRedirect.headers.append("Set-Cookie", cookie));
      return logoutRedirect;
    }

    // Redirigir desde login/register según rol
    if (path === "/login" || path === "/register") {
      if (role === "owner") return redirect("/owner/dashboard");
      if (role === "admin") return redirect("/admin");
      return redirect("/portal/dashboard");
    }

    // /owner/* — exclusivo para owners
    if (path.startsWith("/owner")) {
      if (role !== "owner") {
        return redirect(role === "admin" ? "/admin" : "/portal/dashboard");
      }
    }

    // /admin/* — accesible para admin y owner
    if (path.startsWith("/admin")) {
      if (role !== "admin" && role !== "owner") {
        return redirect("/portal/dashboard");
      }
    }
  }

  // Exponer x-org-id en headers de respuesta (útil para depuración en DevTools)
  supabaseResponse.headers.set("x-org-id", org.orgId);
  return supabaseResponse;
}
