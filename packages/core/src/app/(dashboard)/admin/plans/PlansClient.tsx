// PlansClient.tsx — Componente cliente para gestión interactiva de planes

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlanForm } from "@/components/admin/PlanForm";
import { togglePlanStatus } from "@/actions/membership.actions";
import { formatPrice } from "@/lib/utils";
import type { MembershipPlan } from "@/types/database";

interface PlansClientProps {
  initialPlans: MembershipPlan[];
}

export function PlansClient({ initialPlans }: PlansClientProps) {
  const [plans, setPlans] = useState<MembershipPlan[]>(initialPlans);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | undefined>();

  const openCreate = () => {
    setEditingPlan(undefined);
    setShowDialog(true);
  };

  const openEdit = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setShowDialog(true);
  };

  const handleToggle = async (plan: MembershipPlan) => {
    const result = await togglePlanStatus(plan.id, !plan.is_active);
    if (result.success) {
      setPlans((prev) =>
        prev.map((p) => p.id === plan.id ? { ...p, is_active: !plan.is_active } : p)
      );
      toast.success(plan.is_active ? "Plan desactivado" : "Plan activado");
    } else {
      toast.error("Error al cambiar el estado del plan");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planes de membresía</h1>
          <p className="text-muted-foreground">{plans.length} plan{plans.length !== 1 ? "es" : ""} configurado{plans.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>No hay planes creados aún.</p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>
            Crear el primer plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <Card key={plan.id} className={!plan.is_active ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <Badge variant={plan.is_active ? "default" : "secondary"}>
                    {plan.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {formatPrice(plan.price, plan.currency)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    / {plan.duration_days} días
                  </span>
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {plan.description && (
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                )}

                {plan.features.length > 0 && (
                  <ul className="space-y-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-success mt-0.5">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={() => openEdit(plan)}>
                    <Pencil className="w-3 h-3" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => handleToggle(plan)}
                  >
                    {plan.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {plan.is_active ? "Desactivar" : "Activar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de creación / edición */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Editar plan" : "Nuevo plan de membresía"}
            </DialogTitle>
          </DialogHeader>
          <PlanForm
            plan={editingPlan}
            onSuccess={() => {
              setShowDialog(false);
              // Recargar planes: el Server Action ya ejecutó revalidatePath
              window.location.reload();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
