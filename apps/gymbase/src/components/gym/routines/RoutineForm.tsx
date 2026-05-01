// RoutineForm.tsx — Formulario para crear o editar los metadatos de una rutina

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Dumbbell, Calendar, LayoutTemplate, Sparkles } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { Label } from "@core/components/ui/label";
import { createRoutine, editRoutine } from "@/actions/routine.actions";
import { createRoutineSchema, type CreateRoutineInput } from "@/lib/validations/routines";
import { toOpaqueId } from "@/lib/utils/opaque-id";
import type { Routine } from "@/types/gym-routines";

const DAYS_OPTIONS = [2, 3, 4, 5, 6];
const DURATION_OPTIONS = [4, 6, 8, 12];

interface RoutineFormProps {
  routine?: Routine;
}

export function RoutineForm({ routine }: RoutineFormProps): React.ReactNode {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<CreateRoutineInput>({
      resolver: zodResolver(createRoutineSchema),
      defaultValues: {
        name: routine?.name ?? "",
        description: routine?.description ?? "",
        duration_weeks: routine?.duration_weeks ?? undefined,
        days_per_week: routine?.days_per_week ?? undefined,
        is_template: routine?.is_template ?? true,
        is_default: routine?.is_default ?? false,
      },
    });

  const selectedDays = watch("days_per_week");
  const selectedDuration = watch("duration_weeks");
  const isTemplate = watch("is_template");
  const isDefault = watch("is_default");

  async function onSubmit(data: CreateRoutineInput): Promise<void> {
    setError(null);
    const result = routine
      ? await editRoutine(routine.id, data)
      : await createRoutine(data);

    if (result.success) {
      const targetId = routine ? routine.id : result.data?.id;
      router.push(`/admin/routines/${targetId ? toOpaqueId(targetId) : ""}`);
    } else {
      const msg = typeof result.error === "string" ? result.error : "Error al guardar";
      setError(msg);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm bg-red-500/10 text-red-500 border border-red-500/20">
          {error}
        </div>
      )}

      {/* Nombre */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Dumbbell className="w-4 h-4 text-primary" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Información básica
          </span>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm">Nombre de la rutina</Label>
          <Input
            id="name"
            placeholder="Ej: Fuerza Total — 4 semanas"
            {...register("name")}
            className="h-10"
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description" className="text-sm">Descripción <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <textarea
            id="description"
            {...register("description")}
            rows={3}
            placeholder="Describe el objetivo, nivel recomendado, equipamiento necesario…"
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>
      </div>

      {/* Estructura */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-4 h-4 text-primary" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Estructura
          </span>
        </div>

        {/* Días por semana — selector de chips */}
        <div className="space-y-2">
          <Label className="text-sm">Días por semana</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setValue("days_per_week", selectedDays === d ? undefined : d)}
                className={`w-10 h-10 rounded-xl text-sm font-bold border-2 transition-all ${
                  selectedDays === d
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {d}
              </button>
            ))}
            {/* Input manual si ningún preset está seleccionado */}
            <Input
              type="number"
              placeholder="?"
              {...register("days_per_week", { valueAsNumber: true })}
              className="w-16 h-10 text-center font-bold"
              min={1}
              max={7}
            />
          </div>
          {errors.days_per_week && <p className="text-xs text-red-500">{errors.days_per_week.message}</p>}
        </div>

        {/* Duración — selector de chips */}
        <div className="space-y-2">
          <Label className="text-sm">Duración (semanas)</Label>
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setValue("duration_weeks", selectedDuration === w ? undefined : w)}
                className={`px-4 h-10 rounded-xl text-sm font-bold border-2 transition-all ${
                  selectedDuration === w
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {w} sem
              </button>
            ))}
            <Input
              type="number"
              placeholder="?"
              {...register("duration_weeks", { valueAsNumber: true })}
              className="w-20 h-10 text-center font-bold"
              min={1}
              max={52}
            />
          </div>
          {errors.duration_weeks && <p className="text-xs text-red-500">{errors.duration_weeks.message}</p>}
        </div>
      </div>

      {/* Plantilla y asignación automática */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <LayoutTemplate className="w-4 h-4 text-primary" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Tipo
          </span>
        </div>
        <button
          type="button"
          onClick={() => setValue("is_template", !isTemplate)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
            isTemplate
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/40 hover:border-primary/30"
          }`}
        >
          <div>
            <p className={`font-medium text-sm ${isTemplate ? "text-foreground" : "text-muted-foreground"}`}>
              Plantilla reutilizable
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Se puede asignar a múltiples miembros
            </p>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            isTemplate ? "border-primary bg-primary" : "border-muted-foreground"
          }`}>
            {isTemplate && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
        </button>
        {/* Campo oculto para registrar is_template con RHF */}
        <input type="hidden" {...register("is_template")} />

        {/* Rutina destacada: se asigna automáticamente al aprobar suscripción */}
        <button
          type="button"
          onClick={() => setValue("is_default", !isDefault)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
            isDefault
              ? "border-amber-500 bg-amber-500/5"
              : "border-border bg-muted/40 hover:border-amber-500/30"
          }`}
        >
          <div className="flex items-center gap-3">
            <Sparkles className={`w-4 h-4 shrink-0 ${isDefault ? "text-amber-400" : "text-muted-foreground"}`} />
            <div>
              <p className={`font-medium text-sm ${isDefault ? "text-foreground" : "text-muted-foreground"}`}>
                Asignar automáticamente a nuevos miembros
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Se agrega al activar cualquier suscripción
              </p>
            </div>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            isDefault ? "border-amber-500 bg-amber-500" : "border-muted-foreground"
          }`}>
            {isDefault && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
        </button>
        <input type="hidden" {...register("is_default")} />
      </div>

      {/* Acciones */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} className="gap-2 h-11 px-6">
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {routine ? "Guardar cambios" : "Crear rutina y abrir editor"}
        </Button>
        <Button type="button" variant="outline" className="h-11" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
