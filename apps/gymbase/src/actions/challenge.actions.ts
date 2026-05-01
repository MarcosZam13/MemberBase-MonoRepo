// challenge.actions.ts — Server actions para gestión de retos y gamificación

"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser, getOrgId } from "@/lib/supabase/server";
import {
  fetchChallenges,
  fetchChallengeById,
  insertChallenge,
  fetchParticipantsWithProgress,
  insertParticipant,
  fetchMyParticipation,
  insertChallengeProgress,
  fetchMyBadges,
  fetchAllMyParticipations,
  insertBadge,
} from "@/services/challenge.service";
import { createChallengeSchema, logChallengeProgressSchema } from "@/lib/validations/challenges";
import type { ActionResult } from "@/types/database";
import type { Challenge, ChallengeParticipant, ChallengeBadge } from "@/types/gym-challenges";

export async function getChallenges(): Promise<Challenge[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    // fetchChallenges ya incluye conteo de participantes sin N+1
    return await fetchChallenges(supabase, orgId);
  } catch (error) {
    console.error("[getChallenges] Error:", error);
    return [];
  }
}

export async function getChallengeDetail(challengeId: string): Promise<{
  challenge: Challenge | null;
  participants: ChallengeParticipant[];
  myParticipation: ChallengeParticipant | null;
  myProgress: number;
}> {
  const user = await getCurrentUser();
  if (!user) return { challenge: null, participants: [], myParticipation: null, myProgress: 0 };
  const supabase = await createClient();
  try {
    // Usa fetchParticipantsWithProgress — 1 query con progreso embebido (sin N+1)
    const [challenge, participants] = await Promise.all([
      fetchChallengeById(supabase, challengeId),
      fetchParticipantsWithProgress(supabase, challengeId),
    ]);

    const myParticipation = participants.find((p) => p.user_id === user.id) ?? null;
    const myProgress = myParticipation?.total_progress ?? 0;

    // Ordenar por progreso descendente para el ranking
    const sorted = [...participants].sort(
      (a, b) => (b.total_progress ?? 0) - (a.total_progress ?? 0)
    );

    return { challenge, participants: sorted, myParticipation, myProgress };
  } catch (error) {
    console.error("[getChallengeDetail] Error:", error);
    return { challenge: null, participants: [], myParticipation: null, myProgress: 0 };
  }
}

// Obtiene datos de todos los retos del usuario en un solo batch — usado en portal/challenges/page
export async function getMyAllChallengeData(): Promise<Map<string, { joined: boolean; progress: number }>> {
  const user = await getCurrentUser();
  if (!user) return new Map();
  const supabase = await createClient();
  try {
    const participations = await fetchAllMyParticipations(supabase, user.id);
    const map = new Map<string, { joined: boolean; progress: number }>();
    for (const p of participations) {
      map.set(p.challenge_id, { joined: true, progress: p.total_progress ?? 0 });
    }
    return map;
  } catch (error) {
    console.error("[getMyAllChallengeData] Error:", error);
    return new Map();
  }
}

export async function createChallenge(input: unknown): Promise<ActionResult<Challenge>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };
  const parsed = createChallengeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const challenge = await insertChallenge(supabase, orgId, user.id, {
      ...parsed.data,
      banner_url: parsed.data.banner_url || null,
      exercise_id: parsed.data.exercise_id ?? null,
      target_routine_id: parsed.data.target_routine_id ?? null,
      weight_loss_mode: parsed.data.weight_loss_mode ?? "absolute",
    });
    revalidatePath("/admin/challenges");
    revalidatePath("/portal/challenges");
    return { success: true, data: challenge };
  } catch (error) {
    console.error("[createChallenge] Error:", error);
    return { success: false, error: "Error al crear el reto" };
  }
}

export async function joinChallenge(challengeId: string): Promise<ActionResult<ChallengeParticipant>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const existing = await fetchMyParticipation(supabase, challengeId, user.id);
    if (existing) return { success: false, error: "Ya estás inscrito en este reto" };
    const challenge = await fetchChallengeById(supabase, challengeId);
    if (!challenge) return { success: false, error: "Reto no encontrado" };
    // Verificar capacidad
    if (challenge.max_participants) {
      const supabaseCount = await createClient();
      const { count } = await (await supabaseCount)
        .from("gym_challenge_participants")
        .select("id", { count: "exact", head: true })
        .eq("challenge_id", challengeId)
        .neq("status", "withdrawn");
      if ((count ?? 0) >= challenge.max_participants) {
        return { success: false, error: "El reto está lleno" };
      }
    }
    const participant = await insertParticipant(supabase, challengeId, user.id, orgId);
    revalidatePath(`/portal/challenges/${challengeId}`);
    revalidatePath("/portal/challenges");
    return { success: true, data: participant };
  } catch (error) {
    console.error("[joinChallenge] Error:", error);
    return { success: false, error: "Error al unirse al reto" };
  }
}

export async function logProgress(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  const parsed = logChallengeProgressSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const participation = await fetchMyParticipation(supabase, parsed.data.challenge_id, user.id);
    if (!participation) return { success: false, error: "No estás inscrito en este reto" };
    await insertChallengeProgress(supabase, participation.id, parsed.data.value, parsed.data.notes);
    revalidatePath(`/portal/challenges/${parsed.data.challenge_id}`);
    return { success: true };
  } catch (error) {
    console.error("[logProgress] Error:", error);
    return { success: false, error: "Error al registrar progreso" };
  }
}

export async function getMyBadges(): Promise<ChallengeBadge[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    return await fetchMyBadges(supabase, user.id);
  } catch (error) {
    console.error("[getMyBadges] Error:", error);
    return [];
  }
}

// Solo admin puede otorgar badges manualmente desde el ranking
export async function awardBadge(
  userId: string,
  challengeId: string,
  type: ChallengeBadge["type"]
): Promise<ActionResult<ChallengeBadge>> {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin" && admin.role !== "owner") return { success: false, error: "Sin permisos" };
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const badge = await insertBadge(supabase, userId, orgId, challengeId, type);
    revalidatePath(`/admin/challenges/${challengeId}`);
    return { success: true, data: badge };
  } catch (error) {
    console.error("[awardBadge] Error:", error);
    return { success: false, error: "Error al otorgar el badge (puede que ya exista)" };
  }
}
