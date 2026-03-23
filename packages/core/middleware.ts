// middleware.ts — Guard de autenticación y autorización a nivel de rutas de Next.js

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Ejecuta el middleware en todas las rutas excepto archivos estáticos y APIs de Next.js
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Aplicar middleware a todas las rutas excepto:
     * - _next/static (archivos estáticos de Next.js)
     * - _next/image (optimización de imágenes)
     * - favicon.ico, archivos públicos de tema
     * - rutas de API internas de Next.js
     */
    "/((?!_next/static|_next/image|favicon.ico|theme/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
