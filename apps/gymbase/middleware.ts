// middleware.ts — Guard de autenticación, autorización y resolución de tenant multi-tenant
// Reutiliza la lógica de middleware de MemberBase core extendida con soporte multi-tenant.

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Aplicar a todas las rutas excepto archivos estáticos, APIs internas y la página de error de gym
    "/((?!_next/static|_next/image|favicon.ico|gym-not-found|theme/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
