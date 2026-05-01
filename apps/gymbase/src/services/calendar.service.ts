// calendar.service.ts — Queries de base de datos para calendario de clases y reservas

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClassType, ScheduledClass, ClassBooking, BookingStatus } from "@/types/gym-calendar";

export async function fetchClassTypes(supabase: SupabaseClient, orgId: string): Promise<ClassType[]> {
  const { data, error } = await supabase
    .from("gym_class_types")
    .select("id, org_id, name, color, icon, description")
    .eq("org_id", orgId)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as ClassType[];
}

export async function insertClassType(
  supabase: SupabaseClient,
  orgId: string,
  data: { name: string; color?: string | null; icon?: string | null; description?: string | null }
): Promise<ClassType> {
  const { data: result, error } = await supabase
    .from("gym_class_types")
    .insert({ org_id: orgId, ...data })
    .select("id, org_id, name, color, icon, description")
    .single();
  if (error) throw new Error(error.message);
  return result as ClassType;
}

export async function fetchScheduledClasses(
  supabase: SupabaseClient,
  orgId: string,
  from: string,
  to: string
): Promise<ScheduledClass[]> {
  const { data, error } = await supabase
    .from("gym_scheduled_classes")
    .select(`
      id, org_id, type_id, instructor_id, title, starts_at, ends_at,
      max_capacity, location, description, is_cancelled, created_at,
      recurrence_group_id, recurrence_rule, recurrence_weeks,
      class_type:gym_class_types(id, org_id, name, color, icon, description)
    `)
    .eq("org_id", orgId)
    .gte("starts_at", from)
    .lte("starts_at", to)
    .order("starts_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ScheduledClass[];
}

export async function insertScheduledClass(
  supabase: SupabaseClient,
  orgId: string,
  instructorId: string,
  data: {
    type_id: string;
    title?: string | null;
    starts_at: string;
    ends_at: string;
    max_capacity?: number | null;
    location?: string | null;
    description?: string | null;
  }
): Promise<ScheduledClass> {
  const { data: result, error } = await supabase
    .from("gym_scheduled_classes")
    .insert({ org_id: orgId, instructor_id: instructorId, ...data })
    .select("id, org_id, type_id, instructor_id, title, starts_at, ends_at, max_capacity, location, description, is_cancelled, created_at, recurrence_group_id, recurrence_rule, recurrence_weeks")
    .single();
  if (error) throw new Error(error.message);
  return result as ScheduledClass;
}

export async function cancelScheduledClass(supabase: SupabaseClient, classId: string): Promise<void> {
  const { error } = await supabase
    .from("gym_scheduled_classes")
    .update({ is_cancelled: true })
    .eq("id", classId);
  if (error) throw new Error(error.message);
}

export async function fetchMyBookings(supabase: SupabaseClient, userId: string): Promise<ClassBooking[]> {
  // Incluye reservas confirmadas y en waitlist para mostrárselas al miembro
  const { data, error } = await supabase
    .from("gym_class_bookings")
    .select(`
      id, user_id, org_id, class_id, status, booked_at,
      scheduled_class:gym_scheduled_classes(id, org_id, type_id, instructor_id, title, starts_at, ends_at, max_capacity, location, description, is_cancelled, created_at, recurrence_group_id, recurrence_rule, recurrence_weeks)
    `)
    .eq("user_id", userId)
    .in("status", ["confirmed", "waitlist"])
    .order("booked_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ClassBooking[];
}

export async function insertBooking(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  classId: string,
  status: BookingStatus = "confirmed"
): Promise<ClassBooking> {
  const { data, error } = await supabase
    .from("gym_class_bookings")
    .insert({ user_id: userId, org_id: orgId, class_id: classId, status })
    .select("id, user_id, org_id, class_id, status, booked_at")
    .single();
  if (error) throw new Error(error.message);
  return data as ClassBooking;
}

export async function cancelBooking(supabase: SupabaseClient, bookingId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("gym_class_bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
