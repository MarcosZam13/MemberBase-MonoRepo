// calendar.actions.ts — Server actions para gestión de clases y reservas

"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient, getCurrentUser, getOrgId } from "@/lib/supabase/server";
import {
  fetchClassTypes, insertClassType,
  fetchScheduledClasses, insertScheduledClass, cancelScheduledClass,
  insertBooking, cancelBooking, fetchMyBookings,
} from "@/services/calendar.service";
import { classTypeSchema, scheduleClassSchema, bookClassSchema } from "@/lib/validations/calendar";
import { sendClassCancelledEmail, sendWaitlistConfirmedEmail } from "@/lib/email/send";
import type { ActionResult } from "@/types/database";
import type { ClassType, ScheduledClass, ClassBooking } from "@/types/gym-calendar";

export async function getClassTypes(): Promise<ClassType[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    return await fetchClassTypes(supabase, orgId);
  } catch (error) {
    console.error("[getClassTypes] Error:", error);
    return [];
  }
}

export async function createClassType(input: unknown): Promise<ActionResult<ClassType>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };
  const parsed = classTypeSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const classType = await insertClassType(supabase, orgId, parsed.data);
    revalidatePath("/admin/calendar");
    revalidateTag("class-types", {});
    return { success: true, data: classType };
  } catch (error) {
    console.error("[createClassType] Error:", error);
    return { success: false, error: "Error al crear el tipo de clase" };
  }
}

// TAREA 8 — Fix N+1: obtiene todas las reservas en una sola query y agrupa en memoria
export async function getWeekSchedule(from: string, to: string): Promise<ScheduledClass[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const classes = await fetchScheduledClasses(supabase, orgId, from, to);
    if (classes.length === 0) return [];

    // Una sola query para todos los conteos de reservas confirmadas de la semana
    const classIds = classes.map((c) => c.id);
    const { data: bookings } = await supabase
      .from("gym_class_bookings")
      .select("class_id")
      .in("class_id", classIds)
      .eq("status", "confirmed");

    // Agrupar conteos en memoria con un reduce
    const bookingCounts = (bookings ?? []).reduce<Record<string, number>>((acc, b) => {
      acc[b.class_id] = (acc[b.class_id] ?? 0) + 1;
      return acc;
    }, {});

    return classes.map((c) => ({ ...c, bookings_count: bookingCounts[c.id] ?? 0 }));
  } catch (error) {
    console.error("[getWeekSchedule] Error:", error);
    return [];
  }
}

// TAREA 3 — Engine de recurrencia: genera instancias adicionales según el patrón
export async function scheduleClass(input: unknown): Promise<ActionResult<ScheduledClass>> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };
  const parsed = scheduleClassSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();
    const instructorId = parsed.data.instructor_id ?? user.id;
    const {
      instructor_id: _,
      is_recurring,
      recurrence_rule,
      recurrence_custom_days,
      recurrence_weeks,
      ...classData
    } = parsed.data;

    // Crear la primera instancia normalmente
    const first = await insertScheduledClass(supabase, orgId, instructorId, classData);

    // Si es recurrente, generar las instancias adicionales
    if ((is_recurring ?? false) && recurrence_rule && recurrence_weeks) {
      const firstId = first.id;

      // Marcar la primera instancia con su recurrence_group_id
      await supabase
        .from("gym_scheduled_classes")
        .update({ recurrence_group_id: firstId, recurrence_rule, recurrence_weeks })
        .eq("id", firstId);

      // Calcular las fechas adicionales según el patrón
      const additionalInstances = buildRecurrenceInstances({
        baseStartsAt: classData.starts_at,
        baseEndsAt: classData.ends_at,
        rule: recurrence_rule,
        weeks: recurrence_weeks,
        customDays: recurrence_custom_days ?? [],
      });

      if (additionalInstances.length > 0) {
        const rows = additionalInstances.map(({ starts_at, ends_at }) => ({
          org_id: orgId,
          instructor_id: instructorId,
          type_id: classData.type_id,
          title: classData.title ?? null,
          starts_at,
          ends_at,
          max_capacity: classData.max_capacity ?? null,
          location: classData.location ?? null,
          description: classData.description ?? null,
          recurrence_group_id: firstId,
          recurrence_rule,
          recurrence_weeks,
        }));

        const { error: batchError } = await supabase
          .from("gym_scheduled_classes")
          .insert(rows);

        if (batchError) {
          console.error("[scheduleClass] Error al insertar instancias recurrentes:", batchError);
        }
      }
    }

    revalidatePath("/admin/calendar");
    revalidatePath("/portal/calendar");
    return { success: true, data: first };
  } catch (error) {
    console.error("[scheduleClass] Error:", error);
    return { success: false, error: "Error al programar la clase" };
  }
}

// Genera las fechas de instancias adicionales según el patrón de recurrencia
function buildRecurrenceInstances(params: {
  baseStartsAt: string;
  baseEndsAt: string;
  rule: "daily" | "weekdays" | "weekly" | "custom";
  weeks: number;
  customDays: number[];
}): { starts_at: string; ends_at: string }[] {
  const { baseStartsAt, baseEndsAt, rule, weeks, customDays } = params;
  const baseStart = new Date(baseStartsAt);
  const baseEnd = new Date(baseEndsAt);
  const durationMs = baseEnd.getTime() - baseStart.getTime();

  const instances: { starts_at: string; ends_at: string }[] = [];

  if (rule === "weekly") {
    // Una instancia por semana adicional, misma hora, +7 días
    for (let w = 1; w < weeks; w++) {
      const start = new Date(baseStart.getTime() + w * 7 * 24 * 60 * 60 * 1000);
      instances.push({ starts_at: start.toISOString(), ends_at: new Date(start.getTime() + durationMs).toISOString() });
    }
  } else if (rule === "daily") {
    // Una instancia por día durante (weeks * 7) días, saltando el día base
    const totalDays = weeks * 7;
    for (let d = 1; d < totalDays; d++) {
      const start = new Date(baseStart.getTime() + d * 24 * 60 * 60 * 1000);
      instances.push({ starts_at: start.toISOString(), ends_at: new Date(start.getTime() + durationMs).toISOString() });
    }
  } else if (rule === "weekdays") {
    // Solo lunes a viernes (ISO 1-5) durante (weeks * 7) días
    const totalDays = weeks * 7;
    for (let d = 1; d < totalDays; d++) {
      const start = new Date(baseStart.getTime() + d * 24 * 60 * 60 * 1000);
      // getUTCDay(): 0=Dom, 1=Lun … 6=Sáb → convertir a ISO: 1=Lun … 7=Dom
      const utcDay = start.getUTCDay();
      const isoDay = utcDay === 0 ? 7 : utcDay;
      if (isoDay >= 1 && isoDay <= 5) {
        instances.push({ starts_at: start.toISOString(), ends_at: new Date(start.getTime() + durationMs).toISOString() });
      }
    }
  } else if (rule === "custom" && customDays.length > 0) {
    // Solo en los días ISO especificados, semana por semana
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const candidate = new Date(baseStart.getTime() + (w * 7 + d) * 24 * 60 * 60 * 1000);
        const utcDay = candidate.getUTCDay();
        const isoDay = utcDay === 0 ? 7 : utcDay;
        // Omitir el día base (offset 0) para no duplicarlo
        if ((w === 0 && d === 0)) continue;
        if (customDays.includes(isoDay)) {
          instances.push({ starts_at: candidate.toISOString(), ends_at: new Date(candidate.getTime() + durationMs).toISOString() });
        }
      }
    }
  }

  return instances;
}

// TAREA 3c — Cancela todas las instancias futuras de una serie recurrente
export async function cancelRecurrenceSeries(recurrenceGroupId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };
  const supabase = await createClient();
  try {
    const now = new Date().toISOString();

    // Cancelar todas las instancias futuras de la serie (incluida la raíz si es futura)
    const { error } = await supabase
      .from("gym_scheduled_classes")
      .update({ is_cancelled: true })
      .or(`recurrence_group_id.eq.${recurrenceGroupId},id.eq.${recurrenceGroupId}`)
      .gt("starts_at", now);

    if (error) throw new Error(error.message);

    // Obtener los emails de los miembros afectados para notificarlos
    const { data: affectedClasses } = await supabase
      .from("gym_scheduled_classes")
      .select("id, title, starts_at, class_type:gym_class_types(name)")
      .or(`recurrence_group_id.eq.${recurrenceGroupId},id.eq.${recurrenceGroupId}`)
      .eq("is_cancelled", true)
      .gt("starts_at", now);

    if (affectedClasses && affectedClasses.length > 0) {
      const affectedIds = affectedClasses.map((c) => c.id);
      const { data: bookings } = await supabase
        .from("gym_class_bookings")
        .select("class_id, profiles:user_id(email, full_name)")
        .in("class_id", affectedIds)
        .eq("status", "confirmed");

      // Fire-and-forget: enviar emails sin bloquear el response
      if (bookings) {
        for (const b of bookings) {
          const cls = affectedClasses.find((c) => c.id === b.class_id);
          if (!cls) continue;
          // Supabase retorna joins como arrays — cast via unknown para tipado correcto
          const profile = (b.profiles as unknown) as { email: string; full_name: string | null } | null;
          if (!profile?.email) continue;
          const classType = (cls.class_type as unknown) as { name: string } | null;
          const className = cls.title || classType?.name || "Clase";
          void sendClassCancelledEmail({
            memberEmail: profile.email,
            memberName: profile.full_name ?? profile.email,
            className,
            classDate: new Date(cls.starts_at),
          });
        }
      }
    }

    revalidatePath("/admin/calendar");
    return { success: true };
  } catch (error) {
    console.error("[cancelRecurrenceSeries] Error:", error);
    return { success: false, error: "Error al cancelar la serie" };
  }
}

// TAREA 7 — Cancela clase individual y notifica a los miembros confirmados
export async function cancelClass(classId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };
  const supabase = await createClient();
  try {
    // Obtener datos de la clase antes de cancelarla para el email
    const { data: cls } = await supabase
      .from("gym_scheduled_classes")
      .select("id, title, starts_at, class_type:gym_class_types(name)")
      .eq("id", classId)
      .single();

    await cancelScheduledClass(supabase, classId);

    // Notificar a todos los miembros con reserva confirmada — fire-and-forget
    if (cls) {
      const { data: bookings } = await supabase
        .from("gym_class_bookings")
        .select("profiles:user_id(email, full_name)")
        .eq("class_id", classId)
        .eq("status", "confirmed");

      if (bookings) {
        const classType = (cls.class_type as unknown) as { name: string } | null;
        const className = cls.title || classType?.name || "Clase";
        for (const b of bookings) {
          const profile = (b.profiles as unknown) as { email: string; full_name: string | null } | null;
          if (!profile?.email) continue;
          void sendClassCancelledEmail({
            memberEmail: profile.email,
            memberName: profile.full_name ?? profile.email,
            className,
            classDate: new Date(cls.starts_at),
          });
        }
      }
    }

    revalidatePath("/admin/calendar");
    revalidatePath("/portal/calendar");
    return { success: true };
  } catch (error) {
    console.error("[cancelClass] Error:", error);
    return { success: false, error: "Error al cancelar la clase" };
  }
}

// TAREA 6 — bookClass con UPSERT: maneja UNIQUE (user_id, class_id) y usa RPC para capacidad real
export async function bookClass(input: unknown): Promise<ActionResult<ClassBooking & { waitlisted?: boolean }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  const parsed = bookClassSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  try {
    const orgId = await getOrgId();

    const { data: scheduledClass, error: clsError } = await supabase
      .from("gym_scheduled_classes")
      .select("id, starts_at, max_capacity, is_cancelled")
      .eq("id", parsed.data.class_id)
      .single();

    if (clsError || !scheduledClass) return { success: false, error: "Clase no encontrada" };
    if (scheduledClass.is_cancelled) return { success: false, error: "Esta clase ha sido cancelada" };

    // Validar que la clase no comienza en menos de 30 minutos
    const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60 * 1000);
    if (new Date(scheduledClass.starts_at) < thirtyMinutesFromNow) {
      return { success: false, error: "No se puede reservar con menos de 30 minutos de anticipación" };
    }

    // Buscar reserva existente — el UNIQUE (user_id, class_id) impide un segundo INSERT
    const { data: existing } = await supabase
      .from("gym_class_bookings")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("class_id", parsed.data.class_id)
      .maybeSingle();

    if (existing && existing.status !== "cancelled") {
      const msg = existing.status === "waitlist"
        ? "Ya estás en lista de espera para esta clase"
        : "Ya tienes una reserva confirmada para esta clase";
      return { success: false, error: msg };
    }

    // RPC SECURITY DEFINER — bypasses RLS de miembro para contar confirmados reales
    let bookingStatus: "confirmed" | "waitlist" = "confirmed";
    if (scheduledClass.max_capacity) {
      const { data: confirmedCount } = await supabase
        .rpc("get_class_confirmed_count", { p_class_id: parsed.data.class_id });
      if ((confirmedCount ?? 0) >= scheduledClass.max_capacity) {
        bookingStatus = "waitlist";
      }
    }

    // Reactivar reserva cancelada (UPDATE) o crear nueva (INSERT)
    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from("gym_class_bookings")
        .update({ status: bookingStatus })
        .eq("id", existing.id)
        .select("id, user_id, org_id, class_id, status, booked_at")
        .single();
      if (updateError) throw new Error(updateError.message);
      revalidatePath("/portal/calendar");
      return { success: true, data: { ...updated, waitlisted: bookingStatus === "waitlist" } as ClassBooking & { waitlisted: boolean } };
    }

    const booking = await insertBooking(supabase, user.id, orgId, parsed.data.class_id, bookingStatus);
    revalidatePath("/portal/calendar");
    return { success: true, data: { ...booking, waitlisted: bookingStatus === "waitlist" } };
  } catch (error) {
    console.error("[bookClass] Error:", error);
    return { success: false, error: "Error al reservar la clase" };
  }
}

// TAREA 6b — cancelMyBooking con lógica de promoción desde waitlist
export async function cancelMyBooking(bookingId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  const supabase = await createClient();
  try {
    // Obtener la reserva y la clase asociada para validar tiempo
    const { data: booking } = await supabase
      .from("gym_class_bookings")
      .select("id, class_id, status, gym_scheduled_classes(starts_at)")
      .eq("id", bookingId)
      .eq("user_id", user.id)
      .single();

    if (!booking) return { success: false, error: "Reserva no encontrada" };

    // Supabase retorna joins como arrays — cast via unknown
    const classData = (booking.gym_scheduled_classes as unknown) as { starts_at: string } | null;
    if (classData && new Date(classData.starts_at) <= new Date()) {
      return { success: false, error: "No se puede cancelar una clase que ya comenzó" };
    }

    // Cancelar la reserva del miembro
    await cancelBooking(supabase, bookingId, user.id);

    // Si la reserva era confirmada, promover al primero en waitlist
    if (booking.status === "confirmed") {
      const { data: nextInWaitlist } = await supabase
        .from("gym_class_bookings")
        .select("id, user_id, profiles:user_id(email, full_name)")
        .eq("class_id", booking.class_id)
        .eq("status", "waitlist")
        .order("booked_at", { ascending: true })
        .limit(1)
        .single();

      if (nextInWaitlist) {
        // Promover de waitlist a confirmado
        await supabase
          .from("gym_class_bookings")
          .update({ status: "confirmed" })
          .eq("id", nextInWaitlist.id);

        // Obtener datos de la clase para el email
        const { data: cls } = await supabase
          .from("gym_scheduled_classes")
          .select("title, starts_at, class_type:gym_class_types(name)")
          .eq("id", booking.class_id)
          .single();

        // Notificar al miembro promovido — fire-and-forget
        if (cls) {
          const profile = (nextInWaitlist.profiles as unknown) as { email: string; full_name: string | null } | null;
          if (profile?.email) {
            const classType = (cls.class_type as unknown) as { name: string } | null;
            const className = cls.title || classType?.name || "Clase";
            void sendWaitlistConfirmedEmail({
              memberEmail: profile.email,
              memberName: profile.full_name ?? profile.email,
              className,
              classDate: new Date(cls.starts_at),
            });
          }
        }
      }
    }

    revalidatePath("/portal/calendar");
    return { success: true };
  } catch (error) {
    console.error("[cancelMyBooking] Error:", error);
    return { success: false, error: "Error al cancelar la reserva" };
  }
}

export async function getMyBookings(): Promise<ClassBooking[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  try {
    // Incluir también las reservas en waitlist para mostrarlas en el portal
    return await fetchMyBookings(supabase, user.id);
  } catch (error) {
    console.error("[getMyBookings] Error:", error);
    return [];
  }
}
