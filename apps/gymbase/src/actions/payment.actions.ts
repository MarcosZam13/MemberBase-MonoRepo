// payment.actions.ts — Wraps core payment actions + acción para listar todos los pagos en admin

"use server";

// "use server" no permite export * — se re-exportan solo las funciones necesarias como wrappers async
import {
  approvePayment as coreApprovePayment,
  rejectPayment as coreRejectPayment,
  uploadPaymentProof as coreUploadPaymentProof,
  cancelSubscription as coreCancelSubscription,
  createSubscription as coreCreateSubscription,
  getUserSubscription as coreGetUserSubscription,
  getPendingPayments as coreGetPendingPayments,
  registerManualPayment as coreRegisterManualPayment,
} from "@core/actions/payment.actions";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getCurrentUser, createAdminClient } from "@/lib/supabase/server";
import { buildPaginationRange, buildPaginatedResult } from "@core/types/pagination";
import type { ActionResult, PaymentProofWithDetails, Subscription } from "@/types/database";
import type { PaginatedResult } from "@core/types/pagination";

export type PaymentStatusFilter = "all" | "pending" | "approved" | "rejected";

export async function approvePayment(formData: unknown): Promise<ActionResult> {
  return coreApprovePayment(formData);
}

export async function rejectPayment(formData: unknown): Promise<ActionResult> {
  return coreRejectPayment(formData);
}

export async function uploadPaymentProof(formData: FormData): Promise<ActionResult> {
  return coreUploadPaymentProof(formData);
}

export async function cancelSubscription(subscriptionId: string): Promise<ActionResult> {
  return coreCancelSubscription(subscriptionId);
}

export async function createSubscription(planId: string): Promise<ActionResult<{ subscriptionId: string }>> {
  return coreCreateSubscription(planId);
}

export async function getUserSubscription(): Promise<Subscription | null> {
  return coreGetUserSubscription();
}

export async function getPendingPayments(): Promise<PaymentProofWithDetails[]> {
  return coreGetPendingPayments();
}

// Obtiene comprobantes de pago paginados con filtro de estado para el panel admin
export async function getAllPaymentsAdmin(
  params: { page: number; pageSize: number; status?: PaymentStatusFilter } = { page: 1, pageSize: 25 }
): Promise<PaginatedResult<PaymentProofWithDetails>> {
  const user = await getCurrentUser();
  const empty = buildPaginatedResult([], 0, params);
  if (!user || user.role !== "admin" && user.role !== "owner") return empty;

  const supabase = await createClient();
  const { from, to } = buildPaginationRange(params);

  const PAYMENT_SELECT = `
    id, subscription_id, user_id, file_url, file_path, amount,
    payment_method, notes, status, reviewed_by, reviewed_at,
    rejection_reason, created_at,
    profile:profiles!payment_proofs_user_id_fkey(id, full_name, email, avatar_url),
    subscription:subscriptions!payment_proofs_subscription_id_fkey(
      id, status, starts_at, expires_at,
      plan:membership_plans(id, name, price, currency, duration_days)
    )
  `;

  try {
    // Ejecutar count y data en paralelo — filtro de estado aplicado a ambas queries
    let countQ = supabase.from("payment_proofs").select("*", { count: "exact", head: true });
    let dataQ = supabase
      .from("payment_proofs")
      .select(PAYMENT_SELECT)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (params.status && params.status !== "all") {
      countQ = countQ.eq("status", params.status);
      dataQ = dataQ.eq("status", params.status);
    }

    const [{ count }, { data, error }] = await Promise.all([countQ, dataQ]);
    if (error) throw new Error(error.message);

    const rows = data ?? [];

    // Resolver amounts antes de firmar URLs
    const withAmounts = rows.map((proof) => {
      const subscription = proof.subscription as { plan?: { price?: number } } | null;
      return { ...proof, amount: proof.amount ?? subscription?.plan?.price ?? null };
    });

    // Firmar todas las URLs en un solo llamado al storage (evita N+1)
    const adminClient = createAdminClient();
    const paths = withAmounts.filter((p) => p.file_path).map((p) => p.file_path);
    const { data: signedData } = paths.length > 0
      ? await adminClient.storage.from("payment-proofs").createSignedUrls(paths, 3600)
      : { data: [] };

    const signedMap = new Map((signedData ?? []).map((s) => [s.path, s.signedUrl]));

    const proofs = withAmounts.map((proof) => ({
      ...proof,
      file_url: (proof.file_path && signedMap.get(proof.file_path)) || proof.file_url,
    }));

    return buildPaginatedResult(proofs as unknown as PaymentProofWithDetails[], count ?? 0, params);
  } catch (error) {
    console.error("[getAllPaymentsAdmin] Error:", error);
    return empty;
  }
}

// Cuenta comprobantes pendientes para el subtitle del topbar — query ligera sin datos
export async function getPendingPaymentsCount(): Promise<number> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return 0;

  const supabase = await createClient();
  try {
    const { count, error } = await supabase
      .from("payment_proofs")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return count ?? 0;
  } catch (error) {
    console.error("[getPendingPaymentsCount] Error:", error);
    return 0;
  }
}

// Obtiene el historial de pagos de un miembro específico (para el tab Pagos en su perfil)
export async function getMemberPayments(memberId: string): Promise<PaymentProofWithDetails[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return [];

  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("payment_proofs")
      .select(`
        id, subscription_id, user_id, file_url, file_path, amount,
        payment_method, notes, status, reviewed_by, reviewed_at,
        rejection_reason, created_at,
        subscription:subscriptions!payment_proofs_subscription_id_fkey(
          id, status, starts_at, expires_at,
          plan:membership_plans(id, name, price, currency, duration_days)
        )
      `)
      .eq("user_id", memberId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const withAmounts = rows.map((proof) => {
      const subscription = proof.subscription as { plan?: { price?: number } } | null;
      return { ...proof, amount: proof.amount ?? subscription?.plan?.price ?? null };
    });

    // Firmar todas las URLs en un solo llamado al storage (evita N+1)
    const adminClient = createAdminClient();
    const paths = withAmounts.filter((p) => p.file_path).map((p) => p.file_path);
    const { data: signedData } = paths.length > 0
      ? await adminClient.storage.from("payment-proofs").createSignedUrls(paths, 3600)
      : { data: [] };

    const signedMap = new Map((signedData ?? []).map((s) => [s.path, s.signedUrl]));

    return withAmounts.map((proof) => ({
      ...proof,
      file_url: (proof.file_path && signedMap.get(proof.file_path)) || proof.file_url,
    })) as unknown as PaymentProofWithDetails[];
  } catch (error) {
    console.error("[getMemberPayments] Error:", error);
    return [];
  }
}

const renewManualSubscriptionSchema = z.object({
  memberId: z.string().uuid(),
  subscriptionId: z.string().uuid(),
  planId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.enum(["cash", "card", "transfer", "other"]),
  notes: z.string().optional(),
});

// Re-exporta la acción core para el flujo frío desde /admin/payments
export async function registerManualPayment(input: {
  userId: string;
  planId: string;
  paymentMethod: "efectivo" | "tarjeta" | "transferencia";
  amount: number;
  notes?: string;
}): Promise<ActionResult> {
  return coreRegisterManualPayment(input);
}

// Renueva una suscripción existente con un pago presencial (usado desde el perfil del miembro).
// A diferencia de registerManualPayment, este action opera sobre una suscripción ya existente
// y puede encolar el nuevo período si aún está vigente (no pierde tiempo pagado).
export async function renewManualSubscription(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin" && user.role !== "owner") return { success: false, error: "Sin permisos" };

  const parsed = renewManualSubscriptionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Datos inválidos" };

  const { memberId, subscriptionId, planId, amount, paymentMethod, notes } = parsed.data;
  const supabase = await createClient();

  try {
    // Insertar el comprobante como aprobado — no hay archivo digital en pagos presenciales
    const { error: proofError } = await supabase
      .from("payment_proofs")
      .insert({
        user_id: memberId,
        subscription_id: subscriptionId,
        amount,
        payment_method: paymentMethod,
        notes: notes ?? "Pago presencial registrado por admin",
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        file_url: "",
        file_path: "",
      });

    if (proofError) throw new Error(proofError.message);

    // Obtener duración del plan seleccionado y el vencimiento actual de la suscripción
    // en paralelo — necesitamos ambos para calcular las fechas correctas
    const [{ data: plan }, { data: currentSub }] = await Promise.all([
      supabase.from("membership_plans").select("duration_days").eq("id", planId).single(),
      supabase.from("subscriptions").select("expires_at").eq("id", subscriptionId).single(),
    ]);

    const durationDays = plan?.duration_days ?? 30;

    // Si la suscripción todavía está vigente, encolar el nuevo período
    // para que arranque cuando venza la actual — no se pierde tiempo pagado
    const currentExpiry = currentSub?.expires_at ? new Date(currentSub.expires_at) : null;
    const now = new Date();
    const startsAt = currentExpiry && currentExpiry > now ? currentExpiry : now;
    const expiresAt = new Date(startsAt);
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    // Actualizar suscripción: plan_id si cambió, estado y fechas siempre
    const { error: subError } = await supabase
      .from("subscriptions")
      .update({
        plan_id: planId,
        status: "active",
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq("id", subscriptionId);

    if (subError) throw new Error(subError.message);

    revalidatePath(`/admin/members/${memberId}`);
    revalidatePath("/admin/payments");
    return { success: true };
  } catch (error) {
    console.error("[renewManualSubscription] Error:", error);
    return { success: false, error: "Error al registrar el pago" };
  }
}
