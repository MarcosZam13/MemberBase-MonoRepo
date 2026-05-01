// cached.actions.ts — Wrappers cacheados para planes, tipos de clase y ejercicios (unstable_cache, revalidateTag)

"use server";

import { unstable_cache } from "next/cache";
import { createClient, getCurrentUser, getOrgId } from "@/lib/supabase/server";
import { fetchClassTypes } from "@/services/calendar.service";
import { fetchExercises } from "@/services/exercise.service";
import type { ClassType } from "@/types/gym-calendar";
import type { Exercise } from "@/types/gym-routines";
import type { MembershipPlan } from "@/types/database";

// ─── Planes de membresía ──────────────────────────────────────────────────────
// Se invalida con revalidateTag('membership-plans') al hacer CRUD de planes

const fetchPlansCached = unstable_cache(
  async (orgId: string, onlyActive: boolean): Promise<MembershipPlan[]> => {
    const supabase = await createClient();
    let query = supabase
      .from("membership_plans")
      .select("id, name, description, price, currency, duration_days, features, is_active, sort_order, created_at, updated_at")
      .eq("org_id", orgId)
      .order("sort_order", { ascending: true });
    if (onlyActive) query = query.eq("is_active", true);
    const { data } = await query;
    return (data ?? []).map((plan) => ({
      ...plan,
      features: Array.isArray(plan.features) ? plan.features : [],
    })) as MembershipPlan[];
  },
  ["membership-plans"],
  { revalidate: 3600, tags: ["membership-plans"] }
);

export async function getPlansCached(onlyActive = false): Promise<MembershipPlan[]> {
  try {
    const orgId = await getOrgId();
    return fetchPlansCached(orgId, onlyActive);
  } catch {
    return [];
  }
}

// ─── Tipos de clase ───────────────────────────────────────────────────────────
// Se invalida con revalidateTag('class-types') al hacer CRUD de tipos de clase

const fetchClassTypesCached = unstable_cache(
  async (orgId: string): Promise<ClassType[]> => {
    const supabase = await createClient();
    return fetchClassTypes(supabase, orgId);
  },
  ["class-types"],
  { revalidate: 3600, tags: ["class-types"] }
);

export async function getClassTypesCached(): Promise<ClassType[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  try {
    const orgId = await getOrgId();
    return fetchClassTypesCached(orgId);
  } catch {
    return [];
  }
}

// ─── Ejercicios globales ──────────────────────────────────────────────────────
// Ejercicios de la org + globales del sistema — cambian raramente

const fetchExercisesCached = unstable_cache(
  async (orgId: string): Promise<Exercise[]> => {
    const supabase = await createClient();
    return fetchExercises(supabase, orgId);
  },
  ["global-exercises"],
  { revalidate: 86400, tags: ["global-exercises"] }
);

export async function getExercisesCached(): Promise<Exercise[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  try {
    const orgId = await getOrgId();
    return fetchExercisesCached(orgId);
  } catch {
    return [];
  }
}
