// auth/callback/route.ts — Route handler para OAuth (Google) e invitaciones por email
// Maneja dos flujos:
//   1. OAuth (Google): llega con ?code=...
//   2. Invitaciones / reset de contraseña: llega con ?token_hash=...&type=invite|recovery|email

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "invite" | "recovery" | "email" | null;
  const next = searchParams.get("next") ?? "/portal/dashboard";

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // ── Flujo 1: OAuth (Google) ──────────────────────────────────────────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[OAuth callback] Error al intercambiar código:", error.message);
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(`${origin}/login?error=oauth_failed`);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const destination = profile?.role === "admin" || profile?.role === "owner" ? "/admin" : next;
    return NextResponse.redirect(`${origin}${destination}`);
  }

  // ── Flujo 2: Invitación o recuperación de contraseña ────────────────────────
  // El email de invitación / reset llega con ?token_hash=...&type=invite|recovery
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) {
      console.error("[Email callback] Error al verificar token:", error.message);
      return NextResponse.redirect(`${origin}/login?error=invalid_link`);
    }

    // Tras verificar, la sesión está activa — redirigir a la página para establecer contraseña
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  // Sin parámetros válidos — link inválido o expirado
  return NextResponse.redirect(`${origin}/login?error=invalid_link`);
}
