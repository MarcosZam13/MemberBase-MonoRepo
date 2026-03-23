// useProfile.ts — Hook para obtener el perfil del usuario autenticado en Client Components

"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

// Obtiene el perfil del usuario actual directamente desde el cliente Supabase.
// Usar solo en Client Components — en Server Components usar getCurrentUser() directamente.
export function useProfile() {
  return useQuery<Profile | null>({
    queryKey: ["profile"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url, role, phone, created_at, updated_at")
        .eq("id", user.id)
        .single();

      return data as Profile | null;
    },
    staleTime: 5 * 60_000, // Cachear 5 minutos — el perfil cambia raramente
  });
}
