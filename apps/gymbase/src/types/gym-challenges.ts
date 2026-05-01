// gym-challenges.ts — Tipos para el módulo de retos y gamificación

export type ChallengeType =
  | "attendance"
  | "workout"
  | "weight"
  | "weight_loss"
  | "personal_record"
  | "custom";

export type WeightLossMode = "absolute" | "percentage";
export type ParticipantStatus = "active" | "completed" | "withdrawn";
export type BadgeType = "completed" | "winner" | "top3";

export interface Challenge {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  type: ChallengeType;
  goal_value: number;
  goal_unit: string;
  starts_at: string;
  ends_at: string;
  max_participants: number | null;
  is_public: boolean;
  banner_url: string | null;
  prize_description: string | null;
  created_by: string;
  created_at: string;
  // Campos de configuración por tipo
  exercise_id: string | null;
  target_routine_id: string | null;
  weight_loss_mode: WeightLossMode;
  // Computed fields
  participants_count?: number;
}

export interface ChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  org_id: string;
  status: ParticipantStatus;
  joined_at: string;
  baseline_weight_kg: number | null;
  total_progress?: number;
  profile?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export interface ChallengeProgress {
  id: string;
  participant_id: string;
  value: number;
  recorded_at: string;
  notes: string | null;
}

export interface ChallengeBadge {
  id: string;
  user_id: string;
  org_id: string;
  challenge_id: string;
  earned_at: string;
  type: BadgeType;
  challenge?: Challenge;
}
