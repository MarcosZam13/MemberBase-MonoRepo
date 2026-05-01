// challenge.service.ts — Queries de base de datos para retos y gamificación

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Challenge, ChallengeParticipant, ChallengeProgress, ChallengeBadge } from "@/types/gym-challenges";

// Columnas base del reto incluyendo campos nuevos
const CHALLENGE_COLS = `
  id, org_id, title, description, type, goal_value, goal_unit,
  starts_at, ends_at, max_participants, is_public, banner_url,
  prize_description, created_by, created_at,
  exercise_id, target_routine_id, weight_loss_mode
`;

// Obtiene todos los retos del org con conteo de participantes en 1 sola query
// PostgREST: gym_challenge_participants(count) inyecta el conteo como FK embebida
export async function fetchChallenges(supabase: SupabaseClient, orgId: string): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from("gym_challenges")
    .select(`${CHALLENGE_COLS}, gym_challenge_participants(count)`)
    .eq("org_id", orgId)
    .order("starts_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const countArr = row.gym_challenge_participants as Array<{ count: number }> | null;
    return {
      ...(row as unknown as Challenge),
      participants_count: countArr?.[0]?.count ?? 0,
    };
  });
}

export async function fetchChallengeById(supabase: SupabaseClient, challengeId: string): Promise<Challenge | null> {
  const { data, error } = await supabase
    .from("gym_challenges")
    .select(CHALLENGE_COLS)
    .eq("id", challengeId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Challenge | null;
}

export async function insertChallenge(
  supabase: SupabaseClient,
  orgId: string,
  createdBy: string,
  data: {
    title: string;
    description?: string | null;
    type: string;
    goal_value: number;
    goal_unit: string;
    starts_at: string;
    ends_at: string;
    max_participants?: number | null;
    is_public?: boolean;
    prize_description?: string | null;
    banner_url?: string | null;
    exercise_id?: string | null;
    target_routine_id?: string | null;
    weight_loss_mode?: string | null;
  }
): Promise<Challenge> {
  const { data: result, error } = await supabase
    .from("gym_challenges")
    .insert({ org_id: orgId, created_by: createdBy, ...data })
    .select(CHALLENGE_COLS)
    .single();

  if (error) throw new Error(error.message);
  return result as Challenge;
}

// Obtiene participantes con perfil y progreso total en 1 query (elimina N+1)
// Retorna participantes ordenados por progreso descendente para ranking
export async function fetchParticipantsWithProgress(
  supabase: SupabaseClient,
  challengeId: string
): Promise<ChallengeParticipant[]> {
  const { data, error } = await supabase
    .from("gym_challenge_participants")
    .select(`
      id, challenge_id, user_id, org_id, status, joined_at, baseline_weight_kg,
      profile:profiles(full_name, email, avatar_url),
      progress:gym_challenge_progress(value)
    `)
    .eq("challenge_id", challengeId)
    .neq("status", "withdrawn");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const progressRows = (row.progress as Array<{ value: number }> | null) ?? [];
    const total = progressRows.reduce((sum, p) => sum + (p.value ?? 0), 0);
    return {
      ...(row as unknown as ChallengeParticipant),
      profile: row.profile as unknown as ChallengeParticipant["profile"],
      total_progress: total,
    };
  });
}

export async function fetchParticipants(supabase: SupabaseClient, challengeId: string): Promise<ChallengeParticipant[]> {
  return fetchParticipantsWithProgress(supabase, challengeId);
}

export async function fetchParticipantCount(supabase: SupabaseClient, challengeId: string): Promise<number> {
  const { count, error } = await supabase
    .from("gym_challenge_participants")
    .select("id", { count: "exact", head: true })
    .eq("challenge_id", challengeId)
    .neq("status", "withdrawn");

  if (error) {
    console.error("[fetchParticipantCount] Error:", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function insertParticipant(
  supabase: SupabaseClient,
  challengeId: string,
  userId: string,
  orgId: string
): Promise<ChallengeParticipant> {
  const { data, error } = await supabase
    .from("gym_challenge_participants")
    .insert({ challenge_id: challengeId, user_id: userId, org_id: orgId, status: "active" })
    .select("id, challenge_id, user_id, org_id, status, joined_at, baseline_weight_kg")
    .single();

  if (error) throw new Error(error.message);
  return data as ChallengeParticipant;
}

export async function fetchMyParticipation(
  supabase: SupabaseClient,
  challengeId: string,
  userId: string
): Promise<ChallengeParticipant | null> {
  const { data, error } = await supabase
    .from("gym_challenge_participants")
    .select("id, challenge_id, user_id, org_id, status, joined_at, baseline_weight_kg")
    .eq("challenge_id", challengeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as ChallengeParticipant | null;
}

// Obtiene todas las participaciones activas del usuario en un batch — elimina N+1 en la portal page
export async function fetchAllMyParticipations(
  supabase: SupabaseClient,
  userId: string
): Promise<ChallengeParticipant[]> {
  const { data, error } = await supabase
    .from("gym_challenge_participants")
    .select(`
      id, challenge_id, user_id, org_id, status, joined_at, baseline_weight_kg,
      progress:gym_challenge_progress(value)
    `)
    .eq("user_id", userId)
    .neq("status", "withdrawn");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const progressRows = (row.progress as Array<{ value: number }> | null) ?? [];
    const total = progressRows.reduce((sum, p) => sum + (p.value ?? 0), 0);
    return {
      ...(row as unknown as ChallengeParticipant),
      total_progress: total,
    };
  });
}

export async function insertChallengeProgress(
  supabase: SupabaseClient,
  participantId: string,
  value: number,
  notes?: string | null
): Promise<ChallengeProgress> {
  const { data, error } = await supabase
    .from("gym_challenge_progress")
    .insert({ participant_id: participantId, value, notes: notes ?? null })
    .select("id, participant_id, value, recorded_at, notes")
    .single();

  if (error) throw new Error(error.message);
  return data as ChallengeProgress;
}

// Mantenido por compatibilidad con código existente
export async function fetchChallengeProgressTotal(
  supabase: SupabaseClient,
  participantId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("gym_challenge_progress")
    .select("value")
    .eq("participant_id", participantId);

  if (error) throw new Error(error.message);
  return (data ?? []).reduce((sum, row) => sum + (row.value ?? 0), 0);
}

export async function fetchMyBadges(supabase: SupabaseClient, userId: string): Promise<ChallengeBadge[]> {
  const { data, error } = await supabase
    .from("gym_challenge_badges")
    .select(`
      id, user_id, org_id, challenge_id, earned_at, type,
      challenge:gym_challenges(${CHALLENGE_COLS})
    `)
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ChallengeBadge[];
}

export async function insertBadge(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  challengeId: string,
  type: ChallengeBadge["type"]
): Promise<ChallengeBadge> {
  const { data, error } = await supabase
    .from("gym_challenge_badges")
    .insert({ user_id: userId, org_id: orgId, challenge_id: challengeId, type })
    .select("id, user_id, org_id, challenge_id, earned_at, type")
    .single();

  if (error) throw new Error(error.message);
  return data as ChallengeBadge;
}
