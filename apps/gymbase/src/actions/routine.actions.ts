// routine.actions.ts — Server actions para CRUD de rutinas y asignación a miembros

"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser, getOrgId } from "@/lib/supabase/server";
import { themeConfig } from "@/lib/theme";
import {
  fetchRoutines, fetchRoutineById, insertRoutine, updateRoutine, deleteRoutine,
  addDayToRoutine, addExerciseToDay, updateExerciseInDay, removeExerciseFromDay,
  updateExerciseDefaultSets,
  fetchFeaturedRoutine, assignRoutineToMember,
  getMemberRoutines, getMemberRoutineHistory,
  setFeaturedRoutine, removeRoutineFromMember,
  createMemberRoutine, addDayToMemberRoutine, addExerciseToMemberDay,
  getMemberOwnRoutines, toggleRoutineVisibility,
} from "@/services/routine.service";
import {
  createRoutineSchema, assignRoutineSchema, addRoutineExerciseSchema,
  updateExerciseDefaultSetsSchema,
  assignRoutineToMemberSchema, setFeaturedRoutineSchema, removeRoutineFromMemberSchema,
  createMemberRoutineSchema, updateMemberRoutineSchema,
  addDayToMyRoutineSchema, addExerciseToMyDaySchema,
} from "@/lib/validations/routines";
import type { ActionResult } from "@/types/database";
import type { Routine, RoutineWithDays, RoutineDay, RoutineExercise, MemberRoutine } from "@/types/gym-routines";

export async function getRoutines(): Promise<Routine[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    return await fetchRoutines(supabase, orgId);
  } catch (error) {
    console.error("[getRoutines] Error:", error);
    return [];
  }
}

export async function getRoutineById(routineId: string): Promise<RoutineWithDays | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  try {
    return await fetchRoutineById(supabase, routineId);
  } catch (error) {
    console.error("[getRoutineById] Error:", error);
    return null;
  }
}

export async function createRoutine(input: unknown): Promise<ActionResult<Routine>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };
  const parsed = createRoutineSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const routine = await insertRoutine(supabase, orgId, user.id, parsed.data);
    revalidatePath("/admin/routines");
    return { success: true, data: routine };
  } catch (error) {
    console.error("[createRoutine] Error:", error);
    return { success: false, error: "Error al crear la rutina" };
  }
}

export async function editRoutine(routineId: string, input: unknown): Promise<ActionResult<Routine>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };
  const parsed = createRoutineSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const routine = await updateRoutine(supabase, routineId, parsed.data);
    revalidatePath("/admin/routines");
    revalidatePath(`/admin/routines/${routineId}`);
    return { success: true, data: routine };
  } catch (error) {
    console.error("[editRoutine] Error:", error);
    return { success: false, error: "Error al actualizar la rutina" };
  }
}

export async function removeRoutine(routineId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };
  const supabase = await createClient();
  try {
    await deleteRoutine(supabase, routineId);
    revalidatePath("/admin/routines");
    return { success: true };
  } catch (error) {
    console.error("[removeRoutine] Error:", error);
    return { success: false, error: "Error al eliminar la rutina" };
  }
}

export async function addDay(routineId: string, dayNumber: number, name?: string): Promise<ActionResult<RoutineDay>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };
  const supabase = await createClient();
  try {
    const day = await addDayToRoutine(supabase, routineId, dayNumber, name);
    revalidatePath(`/admin/routines/${routineId}`);
    return { success: true, data: day };
  } catch (error) {
    console.error("[addDay] Error:", error);
    return { success: false, error: "Error al agregar el día" };
  }
}

export async function addExercise(dayId: string, input: unknown): Promise<ActionResult<RoutineExercise>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };
  const parsed = addRoutineExerciseSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const { exercise_id, ...rest } = parsed.data;
    const exercise = await addExerciseToDay(supabase, dayId, exercise_id, rest);
    // Revalidar tanto la lista como el editor específico de la rutina
    revalidatePath("/admin/routines", "layout");
    return { success: true, data: exercise };
  } catch (error) {
    console.error("[addExercise] Error:", error);
    return { success: false, error: "Error al agregar el ejercicio" };
  }
}

export async function updateExerciseParams(
  routineExerciseId: string,
  data: { sets?: number | null; reps?: string | null; rest_seconds?: number | null },
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };
  const supabase = await createClient();
  try {
    await updateExerciseInDay(supabase, routineExerciseId, data);
    return { success: true };
  } catch (error) {
    console.error("[updateExerciseParams] Error:", error);
    return { success: false, error: "Error al actualizar el ejercicio" };
  }
}

// Actualiza los pesos/reps por serie configurados en un ejercicio de la rutina
// El admin puede definir pirámidas o secuencias que se pre-cargan en el portal al miembro
export async function updateExerciseDefaultSetsAction(
  input: unknown
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };
  const parsed = updateExerciseDefaultSetsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    await updateExerciseDefaultSets(supabase, parsed.data.routine_exercise_id, parsed.data.default_sets);
    revalidatePath("/admin/routines", "layout");
    return { success: true };
  } catch (error) {
    console.error("[updateExerciseDefaultSetsAction] Error:", error);
    return { success: false, error: "Error al guardar la configuración de series" };
  }
}

export async function removeExerciseAction(routineExerciseId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };
  const supabase = await createClient();
  try {
    await removeExerciseFromDay(supabase, routineExerciseId);
    revalidatePath("/admin/routines", "layout");
    return { success: true };
  } catch (error) {
    console.error("[removeExerciseAction] Error:", error);
    return { success: false, error: "Error al eliminar el ejercicio" };
  }
}

// Agrega una rutina al stack activo de todos los miembros activos de los planes seleccionados (batch)
// No reemplaza las rutinas existentes — agrega al stack
export async function assignRoutineByPlans(
  routineId: string,
  planIds: string[]
): Promise<ActionResult<{ assigned: number }>> {
  const user = await getCurrentUser();
  if (!user || !["admin", "owner", "trainer"].includes(user.role)) return { success: false, error: "Sin permisos" };

  const supabase = await createClient();
  try {
    const orgId = await getOrgId();

    // Obtener todos los miembros activos de los planes seleccionados.
    // No se filtra por org_id porque las suscripciones pueden tener org_id NULL en registros previos;
    // el filtro por plan_id ya acota al gym correcto ya que los planes son por org.
    const { data: subs, error: subsError } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("status", "active")
      .in("plan_id", planIds);

    if (subsError) throw new Error(subsError.message);
    if (!subs || subs.length === 0) return { success: true, data: { assigned: 0 } };

    const allUserIds = [...new Set(subs.map((s) => s.user_id))];

    // Excluir los miembros que ya tienen esta rutina activa para evitar duplicados
    const { data: existing } = await supabase
      .from("gym_member_routines")
      .select("user_id")
      .eq("routine_id", routineId)
      .eq("is_active", true)
      .in("user_id", allUserIds);

    const existingIds = new Set((existing ?? []).map((r) => r.user_id));
    const eligibleUserIds = allUserIds.filter((uid) => !existingIds.has(uid));

    if (eligibleUserIds.length === 0) return { success: true, data: { assigned: 0 } };

    // Para cada miembro elegible, determinar si necesita ser featured
    // (será featured si actualmente no tiene ninguna rutina activa)
    const { data: withActive } = await supabase
      .from("gym_member_routines")
      .select("user_id")
      .eq("is_active", true)
      .in("user_id", eligibleUserIds);

    const usersWithActiveRoutine = new Set((withActive ?? []).map((r) => r.user_id));

    const rows = eligibleUserIds.map((userId) => ({
      user_id: userId,
      org_id: orgId,
      routine_id: routineId,
      assigned_by: user.id,
      starts_at: new Date().toISOString(),
      is_active: true,
      // Si no tiene ninguna rutina activa, esta será la featured
      is_featured: !usersWithActiveRoutine.has(userId),
    }));

    const { error: insertError } = await supabase.from("gym_member_routines").insert(rows);
    if (insertError) throw new Error(insertError.message);

    revalidatePath(`/admin/routines/${routineId}`);
    revalidatePath("/portal/routines");
    return { success: true, data: { assigned: rows.length } };
  } catch (error) {
    console.error("[assignRoutineByPlans] Error:", error);
    return { success: false, error: "Error al asignar la rutina" };
  }
}

// Obtiene la rutina destacada de un miembro específico (para uso admin y dashboard)
export async function getMemberActiveRoutine(memberId: string): Promise<MemberRoutine | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return null;
  const supabase = await createClient();
  try {
    return await fetchFeaturedRoutine(supabase, memberId);
  } catch (error) {
    console.error("[getMemberActiveRoutine] Error:", error);
    return null;
  }
}

// Obtiene el stack completo de rutinas activas de un miembro
// Admin: pasa userId del miembro — Miembro: usa su propio ID si no se pasa userId
export async function getMemberRoutineStack(
  userId?: string
): Promise<{ active: MemberRoutine[]; history: MemberRoutine[] }> {
  const user = await getCurrentUser();
  if (!user) return { active: [], history: [] };

  // El miembro solo puede ver sus propias rutinas; admin y owner pueden ver las de cualquiera
  const targetId = (user.role === "admin" || user.role === "owner") && userId ? userId : user.id;
  if (user.role !== "admin" && user.role !== "owner" && userId && userId !== user.id) return { active: [], history: [] };

  const supabase = await createClient();
  try {
    const [active, history] = await Promise.all([
      getMemberRoutines(supabase, targetId),
      getMemberRoutineHistory(supabase, targetId),
    ]);
    return { active, history };
  } catch (error) {
    console.error("[getMemberRoutineStack] Error:", error);
    return { active: [], history: [] };
  }
}

export async function getMyRoutine(): Promise<MemberRoutine | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  try {
    return await fetchFeaturedRoutine(supabase, user.id);
  } catch (error) {
    console.error("[getMyRoutine] Error:", error);
    return null;
  }
}

// Agrega una rutina al stack del miembro con etiqueta opcional — admin/owner/trainer
export async function assignRoutineToMemberAction(input: unknown): Promise<ActionResult<MemberRoutine>> {
  const user = await getCurrentUser();
  if (!user || !["admin", "owner", "trainer"].includes(user.role)) return { success: false, error: "Sin permisos" };
  const parsed = assignRoutineToMemberSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const assignment = await assignRoutineToMember(
      supabase, parsed.data.user_id, orgId, parsed.data.routine_id, user.id, parsed.data.label
    );
    revalidatePath(`/admin/members/${parsed.data.user_id}`);
    revalidatePath("/portal/routines");
    return { success: true, data: assignment };
  } catch (error) {
    console.error("[assignRoutineToMemberAction] Error:", error);
    return { success: false, error: "Error al asignar la rutina. Intenta de nuevo." };
  }
}

// Quita una rutina del stack del miembro (soft delete) — admin/owner/trainer
export async function removeRoutineFromMemberAction(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || !["admin", "owner", "trainer"].includes(user.role)) return { success: false, error: "Sin permisos" };
  const parsed = removeRoutineFromMemberSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    // Obtener el user_id del member_routine para revalidar la ruta correcta
    const { data: mr } = await supabase
      .from("gym_member_routines")
      .select("user_id")
      .eq("id", parsed.data.member_routine_id)
      .single();

    await removeRoutineFromMember(supabase, mr?.user_id ?? "", parsed.data.member_routine_id);

    if (mr?.user_id) revalidatePath(`/admin/members/${mr.user_id}`);
    revalidatePath("/portal/routines");
    return { success: true };
  } catch (error) {
    console.error("[removeRoutineFromMemberAction] Error:", error);
    return { success: false, error: "Error al quitar la rutina" };
  }
}

// Cambia la rutina destacada del miembro — admin o el propio miembro pueden llamar este action
export async function setFeaturedRoutineAction(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  const parsed = setFeaturedRoutineSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    // Verificar que la asignación pertenece al usuario correcto
    const { data: mr } = await supabase
      .from("gym_member_routines")
      .select("user_id")
      .eq("id", parsed.data.member_routine_id)
      .single();

    if (!mr) return { success: false, error: "Asignación no encontrada" };

    // El admin puede cambiar la featured de cualquier miembro; el miembro solo la propia
    if (user.role !== "admin" && user.role !== "owner" && mr.user_id !== user.id) {
      return { success: false, error: "Sin permisos" };
    }

    await setFeaturedRoutine(supabase, mr.user_id, parsed.data.member_routine_id);

    if (user.role === "admin" || user.role === "owner") revalidatePath(`/admin/members/${mr.user_id}`);
    revalidatePath("/portal/routines");
    return { success: true };
  } catch (error) {
    console.error("[setFeaturedRoutineAction] Error:", error);
    return { success: false, error: "Error al cambiar la rutina destacada" };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Actions para rutinas propias del miembro (Módulo 3 — Parte 3)
// ══════════════════════════════════════════════════════════════════════════════

// Crea una rutina personalizada del miembro y la asigna automáticamente a su stack
export async function createMyRoutine(input: unknown): Promise<ActionResult<{ routineId: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (!themeConfig.features.gym_member_custom_routines) {
    return { success: false, error: "Funcionalidad no disponible" };
  }

  const parsed = createMemberRoutineSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const routine = await createMemberRoutine(supabase, user.id, orgId, parsed.data);

    // Auto-asignar al stack del miembro — es featured si no tiene otras rutinas activas
    await assignRoutineToMember(supabase, user.id, orgId, routine.id, user.id);

    revalidatePath("/portal/routines");
    return { success: true, data: { routineId: routine.id } };
  } catch (error) {
    console.error("[createMyRoutine] Error:", error);
    return { success: false, error: "Error al crear la rutina" };
  }
}

// Actualiza nombre, descripción o visibilidad de una rutina propia del miembro
export async function updateMyRoutine(routineId: string, input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (!themeConfig.features.gym_member_custom_routines) {
    return { success: false, error: "Funcionalidad no disponible" };
  }

  const parsed = updateMemberRoutineSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from("gym_routines")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", routineId)
      .eq("created_by", user.id)
      .eq("is_member_created", true);

    if (error) throw new Error(error.message);
    revalidatePath("/portal/routines");
    return { success: true };
  } catch (error) {
    console.error("[updateMyRoutine] Error:", error);
    return { success: false, error: "Error al actualizar la rutina" };
  }
}

// Elimina una rutina propia del miembro — verifica que no sea la única activa
export async function deleteMyRoutine(routineId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (!themeConfig.features.gym_member_custom_routines) {
    return { success: false, error: "Funcionalidad no disponible" };
  }

  const supabase = await createClient();
  try {
    // Verificar ownership
    const { data: routine } = await supabase
      .from("gym_routines")
      .select("created_by")
      .eq("id", routineId)
      .eq("is_member_created", true)
      .maybeSingle();

    if (!routine || routine.created_by !== user.id) {
      return { success: false, error: "Sin permisos" };
    }

    // No permitir eliminar si es la única rutina activa del miembro
    const { count } = await supabase
      .from("gym_member_routines")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true);

    if ((count ?? 0) <= 1) {
      return { success: false, error: "No puedes eliminar tu única rutina activa" };
    }

    // Verificar si la asignación es featured para promover la siguiente
    const { data: assignment } = await supabase
      .from("gym_member_routines")
      .select("id, is_featured")
      .eq("user_id", user.id)
      .eq("routine_id", routineId)
      .maybeSingle();

    // Hard delete de la asignación
    await supabase.from("gym_member_routines").delete()
      .eq("routine_id", routineId).eq("user_id", user.id);

    // Si era la featured, promover la siguiente rutina activa
    if (assignment?.is_featured) {
      const { data: next } = await supabase
        .from("gym_member_routines")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (next) {
        await supabase.from("gym_member_routines")
          .update({ is_featured: true }).eq("id", next.id);
      }
    }

    // Hard delete de la rutina (cascade borra días y ejercicios)
    await deleteRoutine(supabase, routineId);

    revalidatePath("/portal/routines");
    return { success: true };
  } catch (error) {
    console.error("[deleteMyRoutine] Error:", error);
    return { success: false, error: "Error al eliminar la rutina" };
  }
}

// Agrega un día a una rutina propia del miembro
export async function addDayToMyRoutine(input: unknown): Promise<ActionResult<RoutineDay>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (!themeConfig.features.gym_member_custom_routines) {
    return { success: false, error: "Funcionalidad no disponible" };
  }

  const parsed = addDayToMyRoutineSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  try {
    const day = await addDayToMemberRoutine(supabase, parsed.data.routine_id, user.id, parsed.data.name);
    revalidatePath("/portal/routines");
    return { success: true, data: day };
  } catch (error) {
    console.error("[addDayToMyRoutine] Error:", error);
    const msg = error instanceof Error ? error.message : "Error al agregar el día";
    return { success: false, error: msg };
  }
}

// Agrega un ejercicio a un día de una rutina propia del miembro
export async function addExerciseToMyDay(input: unknown): Promise<ActionResult<RoutineExercise>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (!themeConfig.features.gym_member_custom_routines) {
    return { success: false, error: "Funcionalidad no disponible" };
  }

  const parsed = addExerciseToMyDaySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  try {
    const { exercise_id, day_id, ...params } = parsed.data;
    const exercise = await addExerciseToMemberDay(supabase, day_id, user.id, exercise_id, params);
    revalidatePath("/portal/routines");
    return { success: true, data: exercise };
  } catch (error) {
    console.error("[addExerciseToMyDay] Error:", error);
    return { success: false, error: "Error al agregar el ejercicio. Intenta de nuevo." };
  }
}

// Cambia si una rutina del miembro es pública (visible para el entrenador) o privada
export async function toggleMyRoutineVisibility(
  routineId: string,
  isPublic: boolean
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (!themeConfig.features.gym_member_custom_routines) {
    return { success: false, error: "Funcionalidad no disponible" };
  }

  const supabase = await createClient();
  try {
    await toggleRoutineVisibility(supabase, routineId, user.id, isPublic);
    revalidatePath("/portal/routines");
    return { success: true };
  } catch (error) {
    console.error("[toggleMyRoutineVisibility] Error:", error);
    return { success: false, error: "Error al actualizar la visibilidad" };
  }
}

// Retorna las rutinas creadas por el propio miembro (para uso en portal y profile)
export async function getMyOwnRoutines(): Promise<RoutineWithDays[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    return await getMemberOwnRoutines(supabase, user.id);
  } catch (error) {
    console.error("[getMyOwnRoutines] Error:", error);
    return [];
  }
}

// Elimina un ejercicio de un día de una rutina propia del miembro
// La RLS de gym_routine_exercises verifica que la rutina padre pertenezca al miembro
export async function removeExerciseFromMyDay(routineExerciseId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from("gym_routine_exercises")
      .delete()
      .eq("id", routineExerciseId);

    if (error) throw new Error(error.message);
    revalidatePath("/portal/routines");
    return { success: true };
  } catch (error) {
    console.error("[removeExerciseFromMyDay] Error:", error);
    return { success: false, error: "Error al eliminar el ejercicio" };
  }
}

// Elimina un día completo de una rutina propia del miembro (cascade borra sus ejercicios)
export async function removeDayFromMyRoutine(dayId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const supabase = await createClient();
  try {
    const { error } = await supabase
      .from("gym_routine_days")
      .delete()
      .eq("id", dayId);

    if (error) throw new Error(error.message);
    revalidatePath("/portal/routines");
    return { success: true };
  } catch (error) {
    console.error("[removeDayFromMyRoutine] Error:", error);
    return { success: false, error: "Error al eliminar el día" };
  }
}

// Compatibilidad con componentes que usaban assignRoutine — delega a assignRoutineToMemberAction
export async function assignRoutine(input: unknown): Promise<ActionResult<MemberRoutine>> {
  const user = await getCurrentUser();
  if (!user || !["admin", "owner", "trainer"].includes(user.role)) return { success: false, error: "Sin permisos" };
  const parsed = assignRoutineSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const assignment = await assignRoutineToMember(supabase, parsed.data.user_id, orgId, parsed.data.routine_id, user.id);
    revalidatePath(`/admin/members/${parsed.data.user_id}`);
    revalidatePath("/portal/routines");
    return { success: true, data: assignment };
  } catch (error) {
    console.error("[assignRoutine] Error:", error);
    return { success: false, error: "Error al asignar la rutina. Intenta de nuevo." };
  }
}
