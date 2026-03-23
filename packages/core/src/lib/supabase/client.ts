// client.ts — Cliente de Supabase para uso en componentes del navegador (Client Components)

import { createBrowserClient } from "@supabase/ssr";

// Crea una instancia del cliente de Supabase para el contexto del navegador.
// Se usa en Client Components con 'use client'.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
