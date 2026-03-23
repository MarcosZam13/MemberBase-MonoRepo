// server.ts — Cliente de Supabase para uso en Server Components y Server Actions

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Crea una instancia del cliente de Supabase para el contexto del servidor.
// Lee las cookies de la request actual para mantener la sesión del usuario.
// Se usa en Server Components, Server Actions y Route Handlers.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll puede fallar en Server Components de solo lectura.
            // Esto es esperado y no afecta la funcionalidad de lectura.
          }
        },
      },
    }
  );
}

// Obtiene el perfil del usuario autenticado actual desde la base de datos.
// Verifica la sesión y luego consulta la tabla profiles para obtener el rol.
export async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, avatar_url, phone, created_at, updated_at")
    .eq("id", user.id)
    .single();

  return profile;
}
