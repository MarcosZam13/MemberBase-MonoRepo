// PaymentsClient.tsx — Lista interactiva de comprobantes con flujo de aprobación/rechazo

"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { approvePayment, rejectPayment } from "@/actions/payment.actions";
import { formatDate, formatPrice } from "@/lib/utils";
import type { PaymentProofWithDetails } from "@/types/database";

interface PaymentsClientProps {
  initialPayments: PaymentProofWithDetails[];
}

export function PaymentsClient({ initialPayments }: PaymentsClientProps) {
  const [payments, setPayments] = useState<PaymentProofWithDetails[]>(initialPayments);
  const [viewingProof, setViewingProof] = useState<PaymentProofWithDetails | null>(null);
  const [rejectingProof, setRejectingProof] = useState<PaymentProofWithDetails | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isPending, setIsPending] = useState(false);

  const removeFromList = (id: string) =>
    setPayments((prev) => prev.filter((p) => p.id !== id));

  const handleApprove = async (proof: PaymentProofWithDetails) => {
    setIsPending(true);
    const result = await approvePayment({
      payment_id: proof.id,
      subscription_id: proof.subscription_id,
    });
    setIsPending(false);

    if (result.success) {
      toast.success("Pago aprobado — membresía activada");
      removeFromList(proof.id);
      setViewingProof(null);
    } else {
      toast.error(typeof result.error === "string" ? result.error : "Error al aprobar");
    }
  };

  const handleReject = async () => {
    if (!rejectingProof) return;
    if (rejectionReason.trim().length < 5) {
      toast.error("El motivo de rechazo debe tener al menos 5 caracteres");
      return;
    }

    setIsPending(true);
    const result = await rejectPayment({
      payment_id: rejectingProof.id,
      subscription_id: rejectingProof.subscription_id,
      rejection_reason: rejectionReason.trim(),
    });
    setIsPending(false);

    if (result.success) {
      toast.success("Pago rechazado — se notificó al cliente");
      removeFromList(rejectingProof.id);
      setRejectingProof(null);
      setRejectionReason("");
      setViewingProof(null);
    } else {
      toast.error(typeof result.error === "string" ? result.error : "Error al rechazar");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Comprobantes de pago</h1>
        <p className="text-muted-foreground">
          {payments.length === 0
            ? "No hay comprobantes pendientes"
            : `${payments.length} comprobante${payments.length > 1 ? "s" : ""} pendiente${payments.length > 1 ? "s" : ""} de revisión`}
        </p>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-success opacity-50" />
          <p>¡Todo al día! No hay comprobantes pendientes.</p>
        </div>
      ) : (
        <div className="rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Miembro</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((proof) => (
                <TableRow key={proof.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{proof.profile?.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{proof.profile?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>{proof.subscription?.plan?.name ?? "—"}</TableCell>
                  <TableCell>
                    {proof.amount
                      ? formatPrice(proof.amount, proof.subscription?.plan?.currency ?? "CRC")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(proof.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">Pendiente</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingProof(proof)}
                    >
                      Revisar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal: ver comprobante y aprobar/rechazar */}
      <Dialog open={!!viewingProof} onOpenChange={() => setViewingProof(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisar comprobante</DialogTitle>
            <DialogDescription>
              {viewingProof?.profile?.full_name} — {viewingProof?.subscription?.plan?.name}
            </DialogDescription>
          </DialogHeader>

          {viewingProof && (
            <div className="space-y-4">
              {/* Vista del comprobante */}
              <div className="border border-border rounded-lg overflow-hidden bg-muted">
                {viewingProof.file_url.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                  <div className="relative h-80">
                    <Image
                      src={viewingProof.file_url}
                      alt="Comprobante de pago"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 gap-2 text-muted-foreground">
                    <a
                      href={viewingProof.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Ver comprobante PDF
                    </a>
                  </div>
                )}
              </div>

              {viewingProof.notes && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Nota del cliente:</span> {viewingProof.notes}
                </p>
              )}

              <DialogFooter className="gap-2 flex-col sm:flex-row">
                <Button
                  variant="outline"
                  className="gap-2 text-danger border-danger hover:bg-danger/10"
                  onClick={() => {
                    setRejectingProof(viewingProof);
                    setViewingProof(null);
                  }}
                >
                  <XCircle className="w-4 h-4" />
                  Rechazar
                </Button>
                <Button
                  className="gap-2 bg-success hover:bg-success/90"
                  onClick={() => handleApprove(viewingProof)}
                  disabled={isPending}
                >
                  <CheckCircle className="w-4 h-4" />
                  {isPending ? "Procesando..." : "Aprobar pago"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: motivo de rechazo */}
      <Dialog open={!!rejectingProof} onOpenChange={() => { setRejectingProof(null); setRejectionReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar comprobante</DialogTitle>
            <DialogDescription>
              Indica el motivo del rechazo. El cliente lo verá en su portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rejection_reason">Motivo del rechazo</Label>
            <Textarea
              id="rejection_reason"
              rows={3}
              placeholder="Ej: El monto no coincide con el plan seleccionado..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectingProof(null); setRejectionReason(""); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isPending || rejectionReason.trim().length < 5}
            >
              {isPending ? "Rechazando..." : "Confirmar rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
