// MembershipClient.tsx — Muestra estado de membresía, subida de comprobante e historial

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Upload, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadPaymentProof } from "@/actions/payment.actions";
import { formatDate, formatPrice } from "@/lib/utils";
import { MAX_FILE_SIZE_LABEL } from "@/lib/constants";
import type { Profile, Subscription, SubscriptionStatus, PaymentProof } from "@/types/database";

const STATUS_CONFIG: Record<SubscriptionStatus | "none", {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = {
  active:    { label: "Membresía activa",     icon: CheckCircle, color: "text-success" },
  pending:   { label: "Pago en revisión",      icon: Clock,       color: "text-warning" },
  expired:   { label: "Membresía vencida",     icon: XCircle,     color: "text-danger" },
  cancelled: { label: "Membresía cancelada",   icon: XCircle,     color: "text-muted-foreground" },
  rejected:  { label: "Pago rechazado",        icon: AlertCircle, color: "text-danger" },
  none:      { label: "Sin membresía activa",  icon: AlertCircle, color: "text-muted-foreground" },
};

interface MembershipClientProps {
  profile: Profile | null;
  subscription: Subscription | null;
}

export function MembershipClient({ profile, subscription }: MembershipClientProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, setIsPending] = useState(false);
  const [notes, setNotes] = useState("");

  const status = (subscription?.status ?? "none") as SubscriptionStatus | "none";
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  // Mostrar el formulario de comprobante solo si hay una suscripción pendiente o rechazada
  const showUploadForm = status === "pending" || status === "rejected";

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("Selecciona un archivo");
      return;
    }

    if (!subscription) {
      toast.error("No hay suscripción activa");
      return;
    }

    setIsPending(true);
    const formData = new FormData();
    formData.set("proof", file);
    formData.set("subscription_id", subscription.id);
    formData.set("notes", notes);

    const result = await uploadPaymentProof(formData);
    setIsPending(false);

    if (result.success) {
      toast.success("Comprobante enviado correctamente. Revisaremos pronto.");
      if (fileRef.current) fileRef.current.value = "";
      setNotes("");
    } else {
      toast.error(typeof result.error === "string" ? result.error : "Error al subir el comprobante");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi membresía</h1>
        <p className="text-muted-foreground">{profile?.email}</p>
      </div>

      {/* Estado actual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${config.color}`} />
            {config.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {subscription?.plan && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">
                {(subscription.plan as { name: string }).name}
              </span>

              {subscription.starts_at && (
                <>
                  <span className="text-muted-foreground">Inicio</span>
                  <span>{formatDate(subscription.starts_at)}</span>
                </>
              )}

              {subscription.expires_at && (
                <>
                  <span className="text-muted-foreground">Vencimiento</span>
                  <span>{formatDate(subscription.expires_at)}</span>
                </>
              )}
            </div>
          )}

          {/* Mostrar el motivo de rechazo si aplica */}
          {status === "rejected" && (() => {
            const proofs = subscription?.payment_proofs as PaymentProof[] | undefined;
            const lastProof = proofs?.[0];
            return lastProof?.rejection_reason ? (
              <div className="rounded-md bg-danger/10 border border-danger/20 p-3 text-sm">
                <p className="font-medium text-danger">Motivo de rechazo:</p>
                <p className="text-muted-foreground mt-1">{lastProof.rejection_reason}</p>
              </div>
            ) : null;
          })()}

          {(status === "none" || status === "expired") && (
            <Button asChild size="sm">
              <Link href="/portal/plans">Ver planes disponibles</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Formulario de subida de comprobante */}
      {showUploadForm && subscription && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {status === "rejected" ? "Subir nuevo comprobante" : "Subir comprobante de pago"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="proof">
                  Archivo del comprobante
                  <span className="text-muted-foreground text-xs ml-1">
                    (JPG, PNG, WebP, PDF — máx. {MAX_FILE_SIZE_LABEL})
                  </span>
                </Label>
                <Input
                  id="proof"
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notas adicionales (opcional)</Label>
                <Textarea
                  id="notes"
                  rows={2}
                  placeholder="Ej: Transferencia realizada el lunes 20 a las 10am..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <Button type="submit" className="gap-2" disabled={isPending}>
                <Upload className="w-4 h-4" />
                {isPending ? "Subiendo..." : "Enviar comprobante"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Historial de comprobantes */}
      {subscription?.payment_proofs && (subscription.payment_proofs as PaymentProof[]).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de comprobantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(subscription.payment_proofs as PaymentProof[]).map((proof) => (
                <div key={proof.id} className="flex items-center justify-between text-sm border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium">{formatDate(proof.created_at)}</p>
                    {proof.amount && (
                      <p className="text-muted-foreground text-xs">
                        {formatPrice(proof.amount, (subscription.plan as { currency: string } | undefined)?.currency ?? "CRC")}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      proof.status === "approved"
                        ? "default"
                        : proof.status === "rejected"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {proof.status === "approved"
                      ? "Aprobado"
                      : proof.status === "rejected"
                      ? "Rechazado"
                      : "Pendiente"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
