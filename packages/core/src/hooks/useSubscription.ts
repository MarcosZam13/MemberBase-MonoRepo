// useSubscription.ts — Hook para obtener la suscripción activa del usuario en Client Components

"use client";

import { useQuery } from "@tanstack/react-query";
import { getUserSubscription } from "@/actions/payment.actions";
import type { Subscription } from "@/types/database";

// Retorna la suscripción actual con cache automático de TanStack Query.
// Se revalida cada 60 segundos para reflejar aprobaciones del admin en tiempo cuasi-real.
export function useSubscription() {
  return useQuery<Subscription | null>({
    queryKey: ["subscription"],
    queryFn: () => getUserSubscription(),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
