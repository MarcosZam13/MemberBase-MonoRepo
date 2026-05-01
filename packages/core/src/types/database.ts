// database.ts — Tipos TypeScript principales del dominio MemberBase

// ─── Enums / Union Types ───────────────────────────────────────────────────────

export type UserRole = "admin" | "owner" | "member";

export type SubscriptionStatus =
  | "pending"
  | "active"
  | "expired"
  | "cancelled"
  | "rejected";

export type PaymentStatus = "pending" | "approved" | "rejected";

export type ContentType = "article" | "video" | "image" | "file" | "link";

// ─── Entidades principales ─────────────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  duration_days: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  // Relaciones opcionales (cuando se hace join en la query)
  plan?: MembershipPlan;
  payment_proofs?: PaymentProof[];
  profile?: Profile;
}

export interface PaymentProof {
  id: string;
  subscription_id: string;
  user_id: string;
  file_url: string;
  file_path: string;
  amount: number | null;
  payment_method: string;
  notes: string | null;
  status: PaymentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  // Relaciones opcionales
  subscription?: Subscription;
  reviewer?: Profile;
}

export interface ContentCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Content {
  id: string;
  title: string;
  description: string | null;
  type: ContentType;
  body: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  is_published: boolean;
  sort_order: number;
  category_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Relaciones opcionales
  plans?: MembershipPlan[];
  category?: ContentCategory | null;
}

// ─── Tipos de respuesta de Server Actions ─────────────────────────────────────

// Tipo estándar para todos los Server Actions del sistema
export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string | Record<string, string[]> };

// ─── Tipos auxiliares para queries con joins ───────────────────────────────────

// Perfil con su suscripción activa (para la tabla de miembros)
export interface MemberWithSubscription extends Profile {
  active_subscription?: Subscription & { plan: MembershipPlan };
}

// Comprobante con datos del usuario y suscripción (para panel de pagos)
export interface PaymentProofWithDetails extends PaymentProof {
  profile: Profile;
  subscription: Subscription & { plan: MembershipPlan };
}

// ─── Comunidad ────────────────────────────────────────────────────────────────

export type ReactionType = "like" | "clap" | "fire" | "muscle" | "heart" | "laugh" | "sad";

export interface CommunityPost {
  id: string;
  user_id: string;
  title: string;
  body: string;
  is_pinned: boolean;
  is_visible: boolean;
  cover_image_url: string | null;
  cover_image_path: string | null;
  created_at: string;
  updated_at: string;
  // Relaciones opcionales
  author?: Pick<Profile, "id" | "full_name" | "avatar_url">;
  comments?: CommunityComment[];
  comment_count?: number;
  // Reacciones procesadas del lado del servidor
  reaction_counts?: Partial<Record<ReactionType, number>>;
  my_reaction?: ReactionType | null;
  // Segmentación por plan (solo admin)
  plan_ids?: string[];
}

export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones opcionales
  author?: Pick<Profile, "id" | "full_name" | "avatar_url">;
}

export interface CommunityReaction {
  id: string;
  post_id: string;
  user_id: string;
  type: ReactionType;
  created_at: string;
}

// ─── KPIs del dashboard de administración ─────────────────────────────────────

export interface AdminDashboardStats {
  activeMembers: number;
  pendingPayments: number;
  monthlyRevenue: number;
  publishedContent: number;
  newMembersLast30Days: number;
}
