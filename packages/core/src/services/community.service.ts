// community.service.ts — Lógica de negocio para posts y comentarios de la comunidad

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CommunityPost, CommunityComment } from "@/types/database";

// Campos del autor que se incluyen en todos los joins de posts y comentarios
const AUTHOR_FIELDS = "author:profiles(id, full_name, avatar_url)";

export async function fetchPosts(supabase: SupabaseClient): Promise<CommunityPost[]> {
  const { data, error } = await supabase
    .from("community_posts")
    .select(`
      id, user_id, title, body, is_pinned, is_visible, created_at, updated_at,
      ${AUTHOR_FIELDS},
      comment_count:community_comments(count)
    `)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // Supabase retorna el count como [{count: N}]; normalizarlo a un número
  return (data ?? []).map((post) => ({
    ...post,
    // Supabase retorna los joins como arrays; tomamos el primer elemento para relaciones N-to-1
    author: Array.isArray(post.author) ? post.author[0] : post.author,
    comment_count: Array.isArray(post.comment_count) ? post.comment_count[0]?.count ?? 0 : 0,
  })) as unknown as CommunityPost[];
}

export async function fetchPostById(
  supabase: SupabaseClient,
  postId: string
): Promise<CommunityPost | null> {
  const { data, error } = await supabase
    .from("community_posts")
    .select(`
      id, user_id, title, body, is_pinned, is_visible, created_at, updated_at,
      ${AUTHOR_FIELDS},
      comments:community_comments(
        id, post_id, user_id, body, is_visible, created_at, updated_at,
        author:profiles(id, full_name, avatar_url)
      )
    `)
    .eq("id", postId)
    .single();

  if (error) return null;

  // Normalizar los joins de autor (Supabase puede retornarlos como arrays)
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
  payload: { title: string; body: string }
): Promise<string> {
  const { data, error } = await supabase
    .from("community_posts")
    .insert({ ...payload, user_id: userId })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function updatePost(
  supabase: SupabaseClient,
  postId: string,
  payload: Partial<{ title: string; body: string; is_pinned: boolean; is_visible: boolean }>
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
  // Para administradores: trae todos los posts incluyendo los ocultos
  const { data, error } = await supabase
    .from("community_posts")
    .select(`
      id, user_id, title, body, is_pinned, is_visible, created_at, updated_at,
      ${AUTHOR_FIELDS},
      comment_count:community_comments(count)
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((post) => ({
    ...post,
    author: Array.isArray(post.author) ? post.author[0] : post.author,
    comment_count: Array.isArray(post.comment_count) ? post.comment_count[0]?.count ?? 0 : 0,
  })) as unknown as CommunityPost[];
}
