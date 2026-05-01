// community.actions.ts — Server actions para el módulo de comunidad

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  fetchPostsForMember,
  fetchPostById,
  createPost,
  assignPostPlans,
  updatePost,
  deletePost,
  createComment,
  updateCommentVisibility,
  fetchAllPostsAdmin,
  upsertReaction,
} from "@/services/community.service";
import type { ActionResult, CommunityPost, ReactionType } from "@/types/database";

// ─── Schemas de validación ────────────────────────────────────────────────────

const createPostSchema = z.object({
  title: z.string().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres"),
  body: z.string().min(1, "El cuerpo no puede estar vacío").max(5000, "Máximo 5000 caracteres"),
  is_pinned: z.boolean().optional().default(false),
  cover_image_url: z.string().url().optional().nullable(),
  cover_image_path: z.string().optional().nullable(),
  // Si está vacío o ausente: post público para todos los miembros activos
  plan_ids: z.array(z.string().uuid()).optional(),
});

const commentSchema = z.object({
  body: z.string().min(1, "El comentario no puede estar vacío").max(1000),
});

const REACTION_TYPES = ["like", "clap", "fire", "muscle", "heart", "laugh", "sad"] as const;

const reactionSchema = z.object({
  post_id: z.string().uuid(),
  type: z.enum(REACTION_TYPES),
});

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// ─── Queries públicas ─────────────────────────────────────────────────────────

// Obtiene los posts visibles filtrados por el plan activo del miembro
export async function getPosts(): Promise<CommunityPost[]> {
  const supabase = await createClient();
  const user = await getCurrentUser();

  try {
    // Admins ven todos los posts sin restricción de plan
    if (user?.role === "admin") {
      return await fetchAllPostsAdmin(supabase);
    }

    if (!user) return [];
    return await fetchPostsForMember(supabase, user.id);
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

// ─── Mutations de posts (solo admins) ────────────────────────────────────────

// Crea un nuevo post — solo admins; soporta imagen de portada y segmentación por plan
export async function createPostAction(formData: unknown): Promise<ActionResult<string>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (user.role !== "admin" && user.role !== "owner") return { success: false, error: "Solo los administradores pueden publicar" };

  const parsed = createPostSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { title, body, is_pinned, cover_image_url, cover_image_path, plan_ids } = parsed.data;

  const supabase = await createClient();
  try {
    const id = await createPost(supabase, user.id, {
      title,
      body,
      is_pinned,
      cover_image_url,
      cover_image_path,
    });

    // Asignar restricciones de plan si se especificaron
    if (plan_ids && plan_ids.length > 0) {
      await assignPostPlans(supabase, id, plan_ids);
    }

    revalidatePath("/portal/community");
    revalidatePath("/admin/community");

    // TODO: [WhatsApp] Notificar a miembros elegibles cuando se publique un nuevo post
    // Implementar cuando se integre WhatsApp Business API
    // Lógica esperada:
    //   1. Obtener miembros con los planes elegibles (o todos si es post público)
    //   2. Filtrar los que tienen `profiles.phone` y han dado consentimiento
    //   3. Enviar via WhatsApp Business API: template "nuevo_anuncio_comunidad"
    //      params: { gym_name, post_title, post_url }
    //   4. Registrar en `notifications` con channel='whatsapp', external_id=response.message_id

    return { success: true, data: id };
  } catch (error) {
    console.error("[createPostAction] Error interno:", error);
    return { success: false, error: "Error al publicar el post. Intenta de nuevo." };
  }
}

// ─── Mutations de reacciones ──────────────────────────────────────────────────

// Alterna la reacción del usuario en un post: misma → elimina; diferente → actualiza; nueva → inserta
export async function toggleReaction(input: {
  post_id: string;
  type: ReactionType;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const parsed = reactionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Reacción inválida" };

  const supabase = await createClient();
  try {
    await upsertReaction(supabase, parsed.data.post_id, user.id, parsed.data.type);
    revalidatePath("/portal/community");
    return { success: true };
  } catch (error) {
    console.error("[toggleReaction] Error interno:", error);
    return { success: false, error: "Error al procesar la reacción. Intenta de nuevo." };
  }
}

// ─── Mutations de comentarios ─────────────────────────────────────────────────

// Agrega un comentario a un post existente
export async function addCommentAction(postId: string, formData: unknown): Promise<ActionResult<string>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const parsed = commentSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const supabase = await createClient();
  try {
    const id = await createComment(supabase, user.id, { post_id: postId, body: parsed.data.body });
    revalidatePath(`/portal/community/${postId}`);
    return { success: true, data: id };
  } catch (error) {
    console.error("[addCommentAction] Error interno:", error);
    return { success: false, error: "Error al enviar el comentario. Intenta de nuevo." };
  }
}

// ─── Queries y mutations de admin ─────────────────────────────────────────────

// Obtiene todos los posts para el panel de administración (incluyendo ocultos)
export async function getAdminPosts(): Promise<CommunityPost[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return [];

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
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const supabase = await createClient();
  try {
    await updatePost(supabase, postId, { is_visible: isVisible });
    revalidatePath("/admin/community");
    revalidatePath("/portal/community");
    return { success: true };
  } catch (error) {
    console.error("[togglePostVisibilityAction] Error interno:", error);
    return { success: false, error: "Error al actualizar la visibilidad." };
  }
}

// Fija o desfija un post en la parte superior — solo admins
export async function togglePostPinnedAction(
  postId: string,
  isPinned: boolean
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const supabase = await createClient();
  try {
    await updatePost(supabase, postId, { is_pinned: isPinned });
    revalidatePath("/admin/community");
    revalidatePath("/portal/community");
    return { success: true };
  } catch (error) {
    console.error("[togglePostPinnedAction] Error interno:", error);
    return { success: false, error: "Error al actualizar el post." };
  }
}

// Permite al autor del post eliminar su propio post — verificación en DB antes de borrar
export async function deleteOwnPostAction(postId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const supabase = await createClient();

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
    console.error("[deleteOwnPostAction] Error interno:", error);
    return { success: false, error: "Error al eliminar el post." };
  }
}

// Elimina un post (y sus comentarios en cascada) — solo admins
export async function deletePostAction(postId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const supabase = await createClient();
  try {
    await deletePost(supabase, postId);
    revalidatePath("/admin/community");
    revalidatePath("/portal/community");
    return { success: true };
  } catch (error) {
    console.error("[deletePostAction] Error interno:", error);
    return { success: false, error: "Error al eliminar el post." };
  }
}

// Cambia la visibilidad de un comentario — solo admins
export async function toggleCommentVisibilityAction(
  commentId: string,
  postId: string,
  isVisible: boolean
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const supabase = await createClient();
  try {
    await updateCommentVisibility(supabase, commentId, isVisible);
    revalidatePath(`/portal/community/${postId}`);
    return { success: true };
  } catch (error) {
    console.error("[toggleCommentVisibilityAction] Error interno:", error);
    return { success: false, error: "Error al actualizar el comentario." };
  }
}

// ─── Upload de imagen de portada ──────────────────────────────────────────────

// Sube la imagen de portada de un post al storage bucket community-covers
export async function uploadPostCover(
  formData: FormData
): Promise<ActionResult<{ url: string; path: string }>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const file = formData.get("file") as File | null;
  if (!file) return { success: false, error: "No se recibió ningún archivo" };

  // Validar tipo y tamaño en el servidor
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return { success: false, error: "Formato no permitido. Use JPG, PNG o WebP." };
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { success: false, error: "La imagen excede el límite de 5MB." };
  }

  const supabase = await createClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  // Usar timestamp para path único sin colisiones
  const path = `covers/${user.id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("community-covers")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("[uploadPostCover] Error de storage:", uploadError);
    return { success: false, error: "Error al subir la imagen. Intenta de nuevo." };
  }

  const { data: urlData } = supabase.storage
    .from("community-covers")
    .getPublicUrl(path);

  return { success: true, data: { url: urlData.publicUrl, path } };
}
