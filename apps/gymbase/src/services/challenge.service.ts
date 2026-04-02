// challenge.service.ts — Queries de base de datos para retos y gamificación

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Challenge, ChallengeParticipant, ChallengeProgress, ChallengeBadge } from "@/types/gym-challenges";

export async function fetchChallenges(supabase: SupabaseClient, orgId: string): Promise<Challenge[]> {
  const { data, error } = await supabase
    .from("gym_challenges")
    .select("id, org_id, title, description, type, goal_value, goal_unit, starts_at, ends_at, max_participants, is_public, banner_url, prize_description, created_by, created_at")
    .eq("org_id", orgId)
    .order("starts_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Challenge[];
}

export async function fetchChallengeById(supabase: SupabaseClient, challengeId: string): Promise<Challenge | null> {
  const { data, error } = await supabase
    .from("gym_challenges")
    .select("id, org_id, title, description, type, goal_value, goal_unit, starts_at, ends_at, max_participants, is_public, banner_url, prize_description, created_by, created_at")
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
    title: string; description?: string | null; type: string; goal_value: number; goal_unit: string;
    starts_at: string; ends_at: string; max_participants?: number | null; is_public?: boolean;
    prize_description?: string | null; banner_url?: string | null;
  }
): Promise<Challenge> {
  const { data: result, error } = await supabase
    .from("gym_challenges")
    .insert({ org_id: orgId, created_by: createdBy, ...data })
    .select("id, org_id, title, description, type, goal_value, goal_unit, starts_at, ends_at, max_participants, is_public, banner_url, prize_description, created_by, created_at")
    .single();
  if (error) throw new Error(error.message);
  return result as Challenge;
}

export async function fetchParticipants(supabase: SupabaseClient, challengeId: string): Promise<ChallengeParticipant[]> {
  const { data, error } = await supabase
    .from("gym_challenge_participants")
    .select(`
      id, challenge_id, user_id, org_id, status, joined_at,
      profile:profiles(full_name, email, avatar_url)
    `)
    .eq("challenge_id", challengeId)
    .order("joined_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ChallengeParticipant[];
}

export async function fetchParticipantCount(supabase: SupabaseClient, challengeId: string): Promise<number> {
  const { count, error } = await supabase
    .from("gym_challenge_participants")
    .select("id", { count: "exact", head: true })
    .eq("challenge_id", challengeId)
    .neq("status", "withdrawn");
  // Retorna 0 silenciosamente si la tabla no existe aún o hay error de RLS
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
    .select("id, challenge_id, user_id, org_id, status, joined_at")
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
    .select("id, challenge_id, user_id, org_id, status, joined_at")
    .eq("challenge_id", challengeId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as ChallengeParticipant | null;
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
      challenge:gym_challenges(id, org_id, title, description, type, goal_value, goal_unit, starts_at, ends_at, max_participants, is_public, banner_url, prize_description, created_by, created_at)
    `)
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ChallengeBadge[];
}
