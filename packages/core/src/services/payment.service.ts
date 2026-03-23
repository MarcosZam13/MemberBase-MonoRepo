// payment.service.ts — Lógica de negocio para comprobantes de pago

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentProofWithDetails } from "@/types/database";
import { STORAGE_BUCKETS } from "@/lib/constants";

// Sube un archivo al storage y retorna el path almacenado
export async function uploadProofFile(
  supabase: SupabaseClient,
  file: File,
  filePath: string
): Promise<string> {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.PAYMENT_PROOFS)
    .upload(filePath, file, { upsert: false });

  if (error) throw new Error(error.message);
  return filePath;
}

// Genera una URL firmada temporal para visualizar un comprobante privado
export async function getSignedProofUrl(
  supabase: SupabaseClient,
  filePath: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data } = await supabase.storage
    .from(STORAGE_BUCKETS.PAYMENT_PROOFS)
    .createSignedUrl(filePath, expiresInSeconds);

  return data?.signedUrl ?? null;
}

// Guarda el registro del comprobante en la base de datos
export async function savePaymentProofRecord(
  supabase: SupabaseClient,
  params: {
    subscriptionId: string;
    userId: string;
    filePath: string;
    amount?: number | null;
    notes?: string | null;
  }
): Promise<void> {
  const { error } = await supabase.from("payment_proofs").insert({
    subscription_id: params.subscriptionId,
    user_id: params.userId,
    file_url: params.filePath,
    file_path: params.filePath,
    amount: params.amount ?? null,
    notes: params.notes ?? null,
    payment_method: "sinpe",
  });

  if (error) throw new Error(error.message);
}

// Obtiene los comprobantes pendientes con signed URLs para visualización
export async function fetchPendingPayments(
  supabase: SupabaseClient
): Promise<PaymentProofWithDetails[]> {
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

  if (error) throw new Error(error.message);

  // Generar signed URLs para cada comprobante (bucket privado, válidas 1 hora)
  const proofs = await Promise.all(
    (data ?? []).map(async (proof) => {
      const signedUrl = await getSignedProofUrl(supabase, proof.file_path);
      return { ...proof, file_url: signedUrl ?? proof.file_url };
    })
  );

  return proofs as unknown as PaymentProofWithDetails[];
}

// Marca un comprobante como aprobado
export async function approveProof(
  supabase: SupabaseClient,
  proofId: string,
  reviewerId: string
): Promise<void> {
  const { error } = await supabase
    .from("payment_proofs")
    .update({
      status: "approved",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", proofId);

  if (error) throw new Error(error.message);
}

// Marca un comprobante como rechazado con motivo obligatorio
export async function rejectProof(
  supabase: SupabaseClient,
  proofId: string,
  reviewerId: string,
  rejectionReason: string
): Promise<void> {
  const { error } = await supabase
    .from("payment_proofs")
    .update({
      status: "rejected",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectionReason,
    })
    .eq("id", proofId);

  if (error) throw new Error(error.message);
}
