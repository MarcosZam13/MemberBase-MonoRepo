// PlanForm.tsx — Formulario para crear y editar planes de membresía

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { createPlanSchema, type CreatePlanInput } from "@/lib/validations/membership";
import { createPlan, updatePlan } from "@/actions/membership.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { MembershipPlan } from "@/types/database";

interface PlanFormProps {
  plan?: MembershipPlan; // Si se pasa, es modo edición
  onSuccess: () => void;
}

export function PlanForm({ plan, onSuccess }: PlanFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [features, setFeatures] = useState<string[]>(plan?.features ?? [""]);

  const isEditing = !!plan;

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<z.input<typeof createPlanSchema>, unknown, CreatePlanInput>({
    resolver: zodResolver(createPlanSchema),
    defaultValues: {
      name: plan?.name ?? "",
      description: plan?.description ?? "",
      price: plan?.price ?? 0,
      currency: (plan?.currency as "CRC" | "USD") ?? "CRC",
      duration_days: plan?.duration_days ?? 30,
      features: plan?.features ?? [],
      is_active: plan?.is_active ?? true,
      sort_order: plan?.sort_order ?? 0,
    },
  });

  // Actualiza el campo de beneficio en la posición indicada
  const updateFeature = (index: number, value: string) => {
    const updated = [...features];
    updated[index] = value;
    setFeatures(updated);
    setValue("features", updated.filter(Boolean));
  };

  const removeFeature = (index: number) => {
    const updated = features.filter((_, i) => i !== index);
    setFeatures(updated.length ? updated : [""]);
    setValue("features", updated.filter(Boolean));
  };

  const addFeature = () => {
    if (features.length < 10) {
      setFeatures([...features, ""]);
    }
  };

  const onSubmit = async (data: CreatePlanInput) => {
    setServerError(null);
    setIsPending(true);

    const payload = { ...data, features: features.filter(Boolean) };
    const result = isEditing
      ? await updatePlan({ ...payload, id: plan.id })
      : await createPlan(payload);

    setIsPending(false);

    if (!result.success) {
      const err = result.error;
      setServerError(typeof err === "string" ? err : "Error al guardar el plan");
      return;
    }

    toast.success(isEditing ? "Plan actualizado" : "Plan creado correctamente");
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre del plan</Label>
          <Input id="name" placeholder="Plan Premium" {...register("name")} />
          {errors.name && <p className="text-sm text-danger">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="duration_days">Duración (días)</Label>
          <Input
            id="duration_days"
            type="number"
            min={1}
            max={365}
            {...register("duration_days", { valueAsNumber: true })}
          />
          {errors.duration_days && <p className="text-sm text-danger">{errors.duration_days.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="price">Precio</Label>
          <Input
            id="price"
            type="number"
            min={0}
            step="0.01"
            {...register("price", { valueAsNumber: true })}
          />
          {errors.price && <p className="text-sm text-danger">{errors.price.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Moneda</Label>
          <Select
            defaultValue={plan?.currency ?? "CRC"}
            onValueChange={(v) => setValue("currency", v as "CRC" | "USD")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CRC">₡ Colones (CRC)</SelectItem>
              <SelectItem value="USD">$ Dólares (USD)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Textarea id="description" rows={2} {...register("description")} />
      </div>

      {/* Lista dinámica de beneficios */}
      <div className="space-y-2">
        <Label>Beneficios del plan</Label>
        {features.map((feature, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={feature}
              onChange={(e) => updateFeature(i, e.target.value)}
              placeholder={`Beneficio ${i + 1}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeFeature(i)}
              disabled={features.length === 1}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
        {features.length < 10 && (
          <Button type="button" variant="outline" size="sm" onClick={addFeature} className="gap-2">
            <Plus className="w-4 h-4" />
            Agregar beneficio
          </Button>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear plan"}
        </Button>
      </div>
    </form>
  );
}
