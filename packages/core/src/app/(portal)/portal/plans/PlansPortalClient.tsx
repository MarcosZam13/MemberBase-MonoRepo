// PlansPortalClient.tsx — Muestra los planes disponibles con CTA de suscripción

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { createSubscription } from "@/actions/payment.actions";
import { formatPrice } from "@/lib/utils";
import { themeConfig } from "@/lib/theme";
import type { MembershipPlan, Subscription } from "@/types/database";

interface PlansPortalClientProps {
  plans: MembershipPlan[];
  currentSubscription: Subscription | null;
}

export function PlansPortalClient({ plans, currentSubscription }: PlansPortalClientProps) {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);

  const hasActiveMembership = currentSubscription?.status === "active";

  const handleSelectPlan = (plan: MembershipPlan) => {
    setSelectedPlan(plan);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan) return;
    setIsPending(true);

    const result = await createSubscription(selectedPlan.id);
    setIsPending(false);

    if (!result.success) {
      toast.error(typeof result.error === "string" ? result.error : "Error al procesar la solicitud");
      return;
    }

    // Mostrar las instrucciones de pago una vez creada la suscripción
    setShowPaymentInstructions(true);
  };

  const handlePaymentDone = () => {
    setShowPaymentInstructions(false);
    router.push("/portal/membership");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planes de membresía</h1>
        <p className="text-muted-foreground">Elige el plan que mejor se adapte a tus necesidades</p>
      </div>

      {hasActiveMembership && (
        <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm">
          Ya tienes una membresía activa con el plan{" "}
          <span className="font-semibold">
            {(currentSubscription?.plan as { name: string } | undefined)?.name ?? ""}
          </span>
          . Puedes explorar los planes disponibles para cuando desees renovar.
        </div>
      )}

      {plans.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">
          No hay planes disponibles en este momento
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan =
              (currentSubscription?.plan as { id: string } | undefined)?.id === plan.id &&
              currentSubscription?.status === "active";

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col ${isCurrentPlan ? "border-primary ring-2 ring-primary" : ""}`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">Tu plan actual</Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold text-primary">
                    {formatPrice(plan.price, plan.currency)}
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      / {plan.duration_days} días
                    </span>
                  </div>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  )}
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? "outline" : "default"}
                    disabled={hasActiveMembership || currentSubscription?.status === "pending"}
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {isCurrentPlan
                      ? "Plan actual"
                      : currentSubscription?.status === "pending"
                      ? "Pago en revisión"
                      : "Suscribirme"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: confirmar suscripción */}
      <Dialog open={!!selectedPlan && !showPaymentInstructions} onOpenChange={() => setSelectedPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar suscripción</DialogTitle>
            <DialogDescription>
              Estás a punto de suscribirte al plan{" "}
              <span className="font-semibold">{selectedPlan?.name}</span> por{" "}
              {selectedPlan && formatPrice(selectedPlan.price, selectedPlan.currency)}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPlan(null)}>Cancelar</Button>
            <Button onClick={handleSubscribe} disabled={isPending}>
              {isPending ? "Procesando..." : "Continuar al pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: instrucciones de pago */}
      <Dialog open={showPaymentInstructions} onOpenChange={() => setShowPaymentInstructions(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instrucciones de pago</DialogTitle>
            <DialogDescription>
              Realiza el pago y luego sube el comprobante en la sección &quot;Mi Membresía&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Método de pago</span>
                <span className="font-medium">SINPE Móvil</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Número</span>
                <span className="font-bold font-mono text-lg text-primary">
                  {themeConfig.payment.sinpe_number}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Monto</span>
                <span className="font-semibold">
                  {selectedPlan && formatPrice(selectedPlan.price, selectedPlan.currency)}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{themeConfig.payment.instructions}</p>
          </div>

          <DialogFooter>
            <Button className="w-full" onClick={handlePaymentDone}>
              Ya realicé el pago — subir comprobante
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
