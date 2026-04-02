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
} from "@core/actions/payment.actions";
import { createClient, getCurrentUser, createAdminClient } from "@/lib/supabase/server";
import type { ActionResult, PaymentProofWithDetails, Subscription } from "@/types/database";

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

// Obtiene todos los comprobantes de pago (cualquier estado) para el panel admin
export async function getAllPaymentsAdmin(): Promise<PaymentProofWithDetails[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return [];

  const supabase = await createClient();
  try {
    const { data, error } = await supabase
      .from("payment_proofs")
      .select(`
        id, subscription_id, user_id, file_url, file_path, amount,
        payment_method, notes, status, reviewed_by, reviewed_at,
        rejection_reason, created_at,
        profile:profiles!payment_proofs_user_id_fkey(id, full_name, email, avatar_url),
        subscription:subscriptions!payment_proofs_subscription_id_fkey(
          id, status, starts_at, expires_at,
          plan:membership_plans(id, name, price, currency, duration_days)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);

    // Generar URLs firmadas con el admin client para omitir las políticas de storage RLS
    const adminClient = createAdminClient();
    const proofs = await Promise.all(
      (data ?? []).map(async (proof) => {
        // Fallback: si amount es NULL en DB, usar el precio del plan
        const subscription = proof.subscription as { plan?: { price?: number } } | null;
        const amount = proof.amount ?? subscription?.plan?.price ?? null;

        if (!proof.file_path) return { ...proof, amount };
        const { data: signed } = await adminClient.storage
          .from("payment-proofs")
          .createSignedUrl(proof.file_path, 3600);
        return { ...proof, amount, file_url: signed?.signedUrl ?? proof.file_url };
      })
    );

    return proofs as unknown as PaymentProofWithDetails[];
  } catch (error) {
    console.error("[getAllPaymentsAdmin] Error:", error);
    return [];
  }
}
