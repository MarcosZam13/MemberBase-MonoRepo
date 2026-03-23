// payment.actions.ts — Server actions para comprobantes de pago y suscripciones

"use server";

import { revalidatePath } from "next/cache";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  uploadProofSchema,
  validateProofFile,
  approvePaymentSchema,
  rejectPaymentSchema,
} from "@/lib/validations/membership";
import { buildProofFilePath } from "@/lib/utils";
import { STORAGE_BUCKETS } from "@/lib/constants";
import type { ActionResult, PaymentProofWithDetails, Subscription } from "@/types/database";

// Crea una suscripción en estado 'pending' cuando el cliente selecciona un plan
export async function createSubscription(planId: string): Promise<ActionResult<{ subscriptionId: string }>> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const supabase = await createClient();

  // Verificar que no tenga ya una suscripción activa o pendiente
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["active", "pending"])
    .single();

  if (existing?.status === "active") {
    return { success: false, error: "Ya tienes una membresía activa" };
  }
  if (existing?.status === "pending") {
    // Reusar la suscripción pendiente existente en lugar de crear una nueva
    return { success: true, data: { subscriptionId: existing.id } };
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({ user_id: user.id, plan_id: planId, status: "pending" })
    .select("id")
    .single();

  if (error) {
    console.error("[createSubscription] Error:", error.message);
    return { success: false, error: "Error al procesar tu solicitud. Intenta de nuevo." };
  }

  revalidatePath("/portal/membership");
  return { success: true, data: { subscriptionId: data.id } };
}

// Sube un comprobante de pago al Storage y crea el registro en la DB
export async function uploadPaymentProof(formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };

  const file = formData.get("proof") as File | null;
  if (!file || !(file instanceof File)) {
    return { success: false, error: "Debes seleccionar un archivo" };
  }

  // Validar el archivo antes de subirlo
  const fileValidation = validateProofFile(file);
  if (!fileValidation.valid) {
    return { success: false, error: fileValidation.error! };
  }

  // Validar el resto del formulario
  const parsed = uploadProofSchema.safeParse({
    subscription_id: formData.get("subscription_id"),
    amount: formData.get("amount") ? Number(formData.get("amount")) : undefined,
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const supabase = await createClient();
  const filePath = buildProofFilePath(parsed.data.subscription_id, file.name);

  // Subir el archivo al bucket privado de Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKETS.PAYMENT_PROOFS)
    .upload(filePath, file, { upsert: false });

  if (uploadError) {
    console.error("[uploadPaymentProof] Error al subir archivo:", uploadError.message);
    return { success: false, error: "Error al subir el comprobante. Intenta de nuevo." };
  }

  // Guardamos solo el path — la URL firmada se genera al momento de consultar
  const { error: dbError } = await supabase.from("payment_proofs").insert({
    subscription_id: parsed.data.subscription_id,
    user_id: user.id,
    file_url: filePath,
    file_path: filePath,
    amount: parsed.data.amount ?? null,
    notes: parsed.data.notes || null,
    payment_method: "sinpe",
  });

  if (dbError) {
    console.error("[uploadPaymentProof] Error al guardar registro:", dbError.message);
    return { success: false, error: "Error al registrar el comprobante." };
  }

  revalidatePath("/portal/membership");
  revalidatePath("/admin/payments");
  return { success: true };
}

// Aprueba un comprobante y activa la suscripción correspondiente (solo admin)
export async function approvePayment(formData: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (user.role !== "admin") return { success: false, error: "Sin permisos" };

  const parsed = approvePaymentSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos" };
  }

  const supabase = await createClient();

  // Obtener la duración del plan para calcular la fecha de expiración
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_id, membership_plans(duration_days)")
    .eq("id", parsed.data.subscription_id)
    .single();

  if (!subscription) {
    return { success: false, error: "Suscripción no encontrada" };
  }

  // Calcular fechas de inicio y expiración
  const startsAt = new Date();
  const expiresAt = new Date();
  const durationDays = (subscription.membership_plans as { duration_days: number }[] | null)?.[0]?.duration_days ?? 30;
  expiresAt.setDate(expiresAt.getDate() + durationDays);

  // Actualizar el comprobante como aprobado
  const { error: proofError } = await supabase
    .from("payment_proofs")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.payment_id);

  if (proofError) {
    console.error("[approvePayment] Error al actualizar comprobante:", proofError.message);
    return { success: false, error: "Error al aprobar el pago." };
  }

  // Activar la suscripción con las fechas calculadas
  const { error: subError } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq("id", parsed.data.subscription_id);

  if (subError) {
    console.error("[approvePayment] Error al activar suscripción:", subError.message);
    return { success: false, error: "Error al activar la membresía." };
  }

  revalidatePath("/admin/payments");
  revalidatePath("/admin/members");
  revalidatePath("/portal/membership");
  return { success: true };
}

// Rechaza un comprobante con motivo obligatorio (solo admin)
export async function rejectPayment(formData: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "No autenticado" };
  if (user.role !== "admin") return { success: false, error: "Sin permisos" };

  const parsed = rejectPaymentSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const supabase = await createClient();

  // Actualizar comprobante con el motivo de rechazo
  const { error: proofError } = await supabase
    .from("payment_proofs")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: parsed.data.rejection_reason,
    })
    .eq("id", parsed.data.payment_id);

  if (proofError) {
    console.error("[rejectPayment] Error:", proofError.message);
    return { success: false, error: "Error al rechazar el pago." };
  }

  // Marcar la suscripción como rechazada para que el cliente lo vea
  await supabase
    .from("subscriptions")
    .update({ status: "rejected" })
    .eq("id", parsed.data.subscription_id);

  revalidatePath("/admin/payments");
  revalidatePath("/portal/membership");
  return { success: true };
}

// Obtiene los comprobantes pendientes de revisión para el panel admin
export async function getPendingPayments(): Promise<PaymentProofWithDetails[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_proofs")
    .select(`
      id, subscription_id, user_id, file_url, file_path, amount,
      payment_method, notes, status, reviewed_by, reviewed_at,
      rejection_reason, created_at,
      profile:profiles!payment_proofs_user_id_fkey(id, email, full_name, role, avatar_url, phone, created_at, updated_at),
      subscription:subscriptions(
        id, user_id, plan_id, status, starts_at, expires_at, created_at, updated_at,
        plan:membership_plans(id, name, description, price, currency, duration_days, features, is_active, sort_order, created_at, updated_at)
      )
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getPendingPayments] Error:", error.message);
    return [];
  }

  // Generar signed URLs para cada comprobante (bucket privado, válidas 1 hora)
  const proofs = await Promise.all(
    (data ?? []).map(async (proof) => {
      const { data: signed } = await supabase.storage
        .from(STORAGE_BUCKETS.PAYMENT_PROOFS)
        .createSignedUrl(proof.file_path, 3600);
      return { ...proof, file_url: signed?.signedUrl ?? proof.file_url };
    })
  );

  return proofs as unknown as PaymentProofWithDetails[];
}

// Obtiene la suscripción activa o pendiente del usuario actual
export async function getUserSubscription(): Promise<Subscription | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(`
      id, user_id, plan_id, status, starts_at, expires_at, created_at, updated_at,
      plan:membership_plans(id, name, description, price, currency, duration_days, features, is_active, sort_order, created_at, updated_at),
      payment_proofs(id, status, created_at, file_url, rejection_reason, amount, notes, payment_method, subscription_id, user_id, file_path, reviewed_by, reviewed_at)
    `)
    .eq("user_id", user.id)
    .in("status", ["active", "pending", "rejected"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data as unknown as Subscription;
}
