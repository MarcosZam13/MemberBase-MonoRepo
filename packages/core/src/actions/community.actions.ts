// community.actions.ts — Server actions para el módulo de comunidad

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  fetchPosts,
  fetchPostById,
  createPost,
  updatePost,
  deletePost,
  createComment,
  updateCommentVisibility,
  fetchAllPostsAdmin,
} from "@/services/community.service";
import type { ActionResult, CommunityPost } from "@/types/database";

const postSchema = z.object({
  title: z.string().min(5, "Mínimo 5 caracteres").max(120),
  body: z.string().min(10, "Mínimo 10 caracteres").max(5000),
});

const commentSchema = z.object({
  body: z.string().min(1, "El comentario no puede estar vacío").max(1000),
});

// Obtiene los posts visibles ordenados por pinned y fecha — accesible para miembros
export async function getPosts(): Promise<CommunityPost[]> {
  const supabase = await createClient();
  try {
    return await fetchPosts(supabase);
  } catch (error) {
    console.error("[getPosts] Error:", error);
    return [];
  }
}

// Obtiene un post con sus comentarios visibles
export async function getPostById(postId: string): Promise<CommunityPost | null> {
  const supabase = await createClient();
  try {
    return await fetchPostById(supabase, postId);
  } catch (error) {
    console.error("[getPostById] Error:", error);
    return null;
  }
}

// Crea un nuevo post — cualquier miembro autenticado puede hacerlo
export async function createPostAction(formData: unknown): Promise<ActionResult<string>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const parsed = postSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> };

  const supabase = await createClient();
  try {
    const id = await createPost(supabase, user.id, parsed.data);
    revalidatePath("/portal/community");
    return { success: true, data: id };
  } catch (error) {
    console.error("[createPostAction] Error:", error);
    return { success: false, error: "Error al publicar el post" };
  }
}

// Agrega un comentario a un post existente
export async function addCommentAction(postId: string, formData: unknown): Promise<ActionResult<string>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const parsed = commentSchema.safeParse(formData);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> };

  const supabase = await createClient();
  try {
    const id = await createComment(supabase, user.id, { post_id: postId, body: parsed.data.body });
    revalidatePath(`/portal/community/${postId}`);
    return { success: true, data: id };
  } catch (error) {
    console.error("[addCommentAction] Error:", error);
    return { success: false, error: "Error al enviar el comentario" };
  }
}

// Obtiene todos los posts para el panel de administración (incluyendo ocultos)
export async function getAdminPosts(): Promise<CommunityPost[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return [];

  const supabase = await createClient();
  try {
    return await fetchAllPostsAdmin(supabase);
  } catch (error) {
    console.error("[getAdminPosts] Error:", error);
    return [];
  }
}

// Cambia la visibilidad de un post (ocultar/mostrar) — solo admins
export async function togglePostVisibilityAction(
  postId: string,
  isVisible: boolean
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };

  const supabase = await createClient();
  try {
    await updatePost(supabase, postId, { is_visible: isVisible });
    revalidatePath("/admin/community");
    revalidatePath("/portal/community");
    return { success: true };
  } catch (error) {
    console.error("[togglePostVisibilityAction] Error:", error);
    return { success: false, error: "Error al actualizar la visibilidad" };
  }
}

// Fija o desfija un post en la parte superior — solo admins
export async function togglePostPinnedAction(
  postId: string,
  isPinned: boolean
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };

  const supabase = await createClient();
  try {
    await updatePost(supabase, postId, { is_pinned: isPinned });
    revalidatePath("/admin/community");
    revalidatePath("/portal/community");
    return { success: true };
  } catch (error) {
    console.error("[togglePostPinnedAction] Error:", error);
    return { success: false, error: "Error al actualizar el post" };
  }
}

// Elimina un post (y sus comentarios en cascada) — solo admins
export async function deletePostAction(postId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };

  const supabase = await createClient();
  try {
    await deletePost(supabase, postId);
    revalidatePath("/admin/community");
    revalidatePath("/portal/community");
    return { success: true };
  } catch (error) {
    console.error("[deletePostAction] Error:", error);
    return { success: false, error: "Error al eliminar el post" };
  }
}

// Permite al autor del post eliminar su propio post
// Verifica en la DB que el usuario sea realmente el autor antes de borrar
export async function deleteOwnPostAction(postId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const supabase = await createClient();

  // Verificar que el post pertenece al usuario antes de eliminar
  const { data: post, error: fetchError } = await supabase
    .from("community_posts")
    .select("user_id")
    .eq("id", postId)
    .single();

  if (fetchError || !post) return { success: false, error: "Post no encontrado" };
  if (post.user_id !== user.id) return { success: false, error: "No tienes permiso para eliminar este post" };

  try {
    await deletePost(supabase, postId);
    revalidatePath("/portal/community");
    return { success: true };
  } catch (error) {
    console.error("[deleteOwnPostAction] Error:", error);
    return { success: false, error: "Error al eliminar el post" };
  }
}

// Cambia la visibilidad de un comentario — solo admins
export async function toggleCommentVisibilityAction(
  commentId: string,
  postId: string,
  isVisible: boolean
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return { success: false, error: "Sin permisos" };

  const supabase = await createClient();
  try {
    await updateCommentVisibility(supabase, commentId, isVisible);
    revalidatePath(`/portal/community/${postId}`);
    return { success: true };
  } catch (error) {
    console.error("[toggleCommentVisibilityAction] Error:", error);
    return { success: false, error: "Error al actualizar el comentario" };
  }
}
