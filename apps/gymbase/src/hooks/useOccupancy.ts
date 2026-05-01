// useOccupancy.ts — Hook de Realtime para suscribirse a cambios de ocupación del gym

"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OccupancyLevel } from "@/types/gym-checkin";
import { DEFAULT_GYM_CAPACITY } from "@/lib/constants";

interface OccupancyState {
  current: number;
  capacity: number;
  level: OccupancyLevel;
  percentage: number;
  isLoading: boolean;
}

function getOccupancyLevel(percentage: number): OccupancyLevel {
  if (percentage < 30) return "free";
  if (percentage < 60) return "moderate";
  if (percentage < 85) return "busy";
  return "full";
}

// Suscribe a cambios en gym_attendance_logs para actualizar la ocupación en tiempo real
export function useOccupancy(orgId: string | undefined): OccupancyState {
  const [state, setState] = useState<OccupancyState>({
    current: 0,
    capacity: DEFAULT_GYM_CAPACITY,
    level: "free",
    percentage: 0,
    isLoading: true,
  });

  // Cachear la capacidad para no re-fetchearla en cada evento realtime
  const capacityRef = useRef<number>(DEFAULT_GYM_CAPACITY);

  useEffect(() => {
    if (!orgId) return;

    const supabase = createClient();

    // Carga inicial — incluye la capacidad real del gym desde organizations
    async function fetchOccupancy(): Promise<void> {
      const [{ count }, { data: org }] = await Promise.all([
        supabase
          .from("gym_attendance_logs")
          .select("*", { count: "exact", head: true })
          .eq("org_id", orgId)
          .is("check_out_at", null),
        supabase
          .from("organizations")
          .select("max_capacity")
          .eq("id", orgId)
          .single(),
      ]);

      const capacity = org?.max_capacity ?? DEFAULT_GYM_CAPACITY;
      capacityRef.current = capacity;
      const current = count ?? 0;
      const percentage = Math.min(100, Math.round((current / capacity) * 100));

      setState({
        current,
        capacity,
        level: getOccupancyLevel(percentage),
        percentage,
        isLoading: false,
      });
    }

    // Re-fetch solo conteo en eventos realtime (capacidad ya cacheada)
    async function fetchCount(): Promise<void> {
      const { count } = await supabase
        .from("gym_attendance_logs")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .is("check_out_at", null);

      const capacity = capacityRef.current;
      const current = count ?? 0;
      const percentage = Math.min(100, Math.round((current / capacity) * 100));

      setState({
        current,
        capacity,
        level: getOccupancyLevel(percentage),
        percentage,
        isLoading: false,
      });
    }

    fetchOccupancy();

    // Suscribir a cambios en tiempo real — solo re-fetch el conteo, capacidad ya cacheada
    const channel = supabase
      .channel("occupancy-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gym_attendance_logs",
          filter: `org_id=eq.${orgId}`,
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  return state;
}
