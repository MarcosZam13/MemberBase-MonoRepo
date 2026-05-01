// community.service.ts — Lógica de negocio para posts, comentarios y reacciones de la comunidad

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommunityPost, CommunityComment, ReactionType } from "@/types/database";

// Campos del autor que se incluyen en todos los joins de posts y comentarios
const AUTHOR_FIELDS = "author:profiles(id, full_name, avatar_url)";

// Campos base del post incluyendo los nuevos de v2
const POST_FIELDS = `
  id, user_id, title, body, is_pinned, is_visible,
  cover_image_url, cover_image_path,
  created_at, updated_at,
  ${AUTHOR_FIELDS},
  comment_count:community_comments(count),
  reactions:community_reactions(type, user_id)
`;

// Normaliza el resultado raw de Supabase en CommunityPost con conteos de reacciones
function normalizePost(
  raw: Record<string, unknown>,
  currentUserId?: string | null
): CommunityPost {
  const author = Array.isArray(raw.author) ? raw.author[0] : raw.author;
  const commentCount = Array.isArray(raw.comment_count)
    ? (raw.comment_count[0]?.count ?? 0)
    : 0;

  // Calcular conteos por tipo y la reacción del usuario actual
  const rawReactions = (raw.reactions as Array<{ type: string; user_id: string }>) ?? [];
  const reaction_counts: Partial<Record<ReactionType, number>> = {};
  let my_reaction: ReactionType | null = null;

  for (const r of rawReactions) {
    const t = r.type as ReactionType;
    reaction_counts[t] = (reaction_counts[t] ?? 0) + 1;
    if (currentUserId && r.user_id === currentUserId) {
      my_reaction = t;
    }
  }

  return {
    ...(raw as unknown as CommunityPost),
    author: author as CommunityPost["author"],
    comment_count: commentCount,
    reaction_counts,
    my_reaction,
  };
}

export async function fetchPosts(
  supabase: SupabaseClient,
  currentUserId?: string | null
): Promise<CommunityPost[]> {
  const { data, error } = await supabase
    .from("community_posts")
    .select(POST_FIELDS)
    .eq("is_visible", true)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((post) => normalizePost(post as Record<string, unknown>, currentUserId));
}

// Versión para miembros: filtra posts por el plan activo del miembro
// Un post es visible si no tiene restricción de plan, o si el plan activo del miembro está incluido
export async function fetchPostsForMember(
  supabase: SupabaseClient,
  userId: string
): Promise<CommunityPost[]> {
  // Obtener el plan activo del miembro para el filtro
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const memberPlanId = sub?.plan_id ?? null;

  const { data, error } = await supabase
    .from("community_posts")
    .select(`${POST_FIELDS}, post_plans:community_post_plans(plan_id)`)
    .eq("is_visible", true)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // Filtrar en memoria: post público (sin restricciones) o el plan del miembro coincide
  return (data ?? [])
    .filter((post) => {
      const planRestrictions = (post.post_plans as Array<{ plan_id: string }>) ?? [];
      if (planRestrictions.length === 0) return true;
      if (!memberPlanId) return false;
      return planRestrictions.some((pp) => pp.plan_id === memberPlanId);
    })
    .map((post) => normalizePost(post as Record<string, unknown>, userId));
}

export async function fetchPostById(
  supabase: SupabaseClient,
  postId: string
): Promise<CommunityPost | null> {
  const { data, error } = await supabase
    .from("community_posts")
    .select(`
      id, user_id, title, body, is_pinned, is_visible,
      cover_image_url, cover_image_path,
      created_at, updated_at,
      ${AUTHOR_FIELDS},
      comments:community_comments(
        id, post_id, user_id, body, is_visible, created_at, updated_at,
        author:profiles(id, full_name, avatar_url)
      )
    `)
    .eq("id", postId)
    .single();

  if (error) return null;

  const normalized = {
    ...data,
    author: Array.isArray(data.author) ? data.author[0] : data.author,
    comments: (data.comments ?? []).map((c: Record<string, unknown>) => ({
      ...c,
      author: Array.isArray(c.author) ? (c.author as unknown[])[0] : c.author,
    })),
  };
  return normalized as unknown as CommunityPost;
}

export async function createPost(
  supabase: SupabaseClient,
  userId: string,
  payload: {
    title: string;
    body: string;
    is_pinned?: boolean;
    cover_image_url?: string | null;
    cover_image_path?: string | null;
  }
): Promise<string> {
  const { data, error } = await supabase
    .from("community_posts")
    .insert({ ...payload, user_id: userId })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function assignPostPlans(
  supabase: SupabaseClient,
  postId: string,
  planIds: string[]
): Promise<void> {
  if (planIds.length === 0) return;

  const rows = planIds.map((plan_id) => ({ post_id: postId, plan_id }));
  const { error } = await supabase.from("community_post_plans").insert(rows);
  if (error) throw new Error(error.message);
}

export async function updatePost(
  supabase: SupabaseClient,
  postId: string,
  payload: Partial<{
    title: string;
    body: string;
    is_pinned: boolean;
    is_visible: boolean;
    cover_image_url: string | null;
    cover_image_path: string | null;
  }>
): Promise<void> {
  const { error } = await supabase
    .from("community_posts")
    .update(payload)
    .eq("id", postId);

  if (error) throw new Error(error.message);
}

export async function deletePost(supabase: SupabaseClient, postId: string): Promise<void> {
  const { error } = await supabase
    .from("community_posts")
    .delete()
    .eq("id", postId);

  if (error) throw new Error(error.message);
}

export async function createComment(
  supabase: SupabaseClient,
  userId: string,
  payload: { post_id: string; body: string }
): Promise<string> {
  const { data, error } = await supabase
    .from("community_comments")
    .insert({ ...payload, user_id: userId })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateCommentVisibility(
  supabase: SupabaseClient,
  commentId: string,
  isVisible: boolean
): Promise<void> {
  const { error } = await supabase
    .from("community_comments")
    .update({ is_visible: isVisible })
    .eq("id", commentId);

  if (error) throw new Error(error.message);
}

export async function fetchAllPostsAdmin(supabase: SupabaseClient): Promise<CommunityPost[]> {
  // Para administradores: trae todos los posts incluyendo ocultos, con plan_ids
  const { data, error } = await supabase
    .from("community_posts")
    .select(`
      ${POST_FIELDS},
      post_plans:community_post_plans(plan_id)
    `)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((post) => {
    const normalized = normalizePost(post as Record<string, unknown>, null);
    const planIds = ((post.post_plans as Array<{ plan_id: string }>) ?? []).map((pp) => pp.plan_id);
    return { ...normalized, plan_ids: planIds };
  });
}

// ─── Reacciones ───────────────────────────────────────────────────────────────

// Upsert / delete de reacción: si el tipo es el mismo → elimina; si es diferente → actualiza; si no existe → inserta
export async function upsertReaction(
  supabase: SupabaseClient,
  postId: string,
  userId: string,
  type: ReactionType
): Promise<{ action: "added" | "changed" | "removed" }> {
  // Buscar reacción existente del usuario en este post
  const { data: existing } = await supabase
    .from("community_reactions")
    .select("id, type")
    .eq("post_id", postId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    if (existing.type === type) {
      // Mismo tipo → toggle off (eliminar)
      const { error } = await supabase
        .from("community_reactions")
        .delete()
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { action: "removed" };
    } else {
      // Tipo diferente → cambiar reacción
      const { error } = await supabase
        .from("community_reactions")
        .update({ type })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { action: "changed" };
    }
  }

  // No existe → insertar nueva reacción
  const { error } = await supabase
    .from("community_reactions")
    .insert({ post_id: postId, user_id: userId, type });
  if (error) throw new Error(error.message);
  return { action: "added" };
}
