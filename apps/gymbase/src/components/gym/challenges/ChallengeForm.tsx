// ChallengeForm.tsx — Formulario admin para crear un nuevo reto con selector visual

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { Textarea } from "@core/components/ui/textarea";
import { Alert, AlertDescription } from "@core/components/ui/alert";
import { createChallenge } from "@/actions/challenge.actions";
import { createChallengeSchema, type CreateChallengeInput } from "@/lib/validations/challenges";
import { cn } from "@core/lib/utils";

// Tipos de reto con descripción para las cards visuales
const CHALLENGE_TYPES = [
  {
    value: "attendance",
    icon: "🏃",
    name: "Asistencia",
    desc: "Meta en cantidad de visitas al gym. El QR cuenta automáticamente.",
    unit: "asistencias",
  },
  {
    value: "workout",
    icon: "💪",
    name: "Workout",
    desc: "Meta en sesiones de rutina completadas en la app.",
    unit: "sesiones",
  },
  {
    value: "weight",
    icon: "⚖️",
    name: "Peso / Métrica",
    desc: "Cambio en kg o % de grasa. Requiere medición al inicio y al final.",
    unit: "kg",
  },
  {
    value: "custom",
    icon: "⚙️",
    name: "Personalizado",
    desc: "El participante registra su progreso manualmente con un número.",
    unit: "",
  },
];

// Opciones de visibilidad del reto
const VISIBILITY_OPTS = [
  { value: "all",     icon: "🌐", label: "Todos",    desc: "Cualquier miembro activo" },
  { value: "private", icon: "🔒", label: "Privado",  desc: "Solo admins" },
];

export function ChallengeForm(): React.ReactNode {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("");
  const [visibility, setVisibility] = useState<string>("all");

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<CreateChallengeInput>({
    resolver: zodResolver(createChallengeSchema),
    defaultValues: { is_public: true },
  });

  function handleTypeSelect(value: string): void {
    setSelectedType(value);
    setValue("type", value as CreateChallengeInput["type"]);
    const typeInfo = CHALLENGE_TYPES.find(t => t.value === value);
    if (typeInfo?.unit) setValue("goal_unit", typeInfo.unit);
  }

  function handleVisibilitySelect(value: string): void {
    setVisibility(value);
    setValue("is_public", value === "all");
  }

  async function onSubmit(data: CreateChallengeInput): Promise<void> {
    setError(null);
    const result = await createChallenge({
      ...data,
      banner_url: data.banner_url || null,
    });
    if (result.success) {
      router.push("/admin/challenges");
    } else {
      const msg = typeof result.error === "string" ? result.error : "Error al crear el reto";
      setError(msg);
    }
  }

  const sectionClass = "text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.1em] mb-3 mt-6 pb-2 border-b border-[#1a1a1a]";
  const labelClass = "text-[10px] font-semibold text-[#666] uppercase tracking-[0.08em] mb-1.5 block";
  const inputClass = "h-9 bg-[#161616] border-[#2a2a2a] text-sm focus-visible:ring-0 focus:border-[#FF5E14]";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-0">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Información básica ── */}
      <div className={sectionClass}>Información básica</div>

      <div className="mb-4">
        <label className={labelClass}>Título del reto <span className="text-[#FF5E14]">*</span></label>
        <Input
          placeholder="Ej: Reto Enero Activo"
          className={inputClass}
          {...register("title")}
        />
        {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
      </div>

      <div className="mb-4">
        <label className={labelClass}>Descripción y reglas <span className="text-[#FF5E14]">*</span></label>
        <Textarea
          rows={3}
          placeholder="Explicá las reglas y el objetivo del reto…"
          className="bg-[#161616] border-[#2a2a2a] text-sm focus-visible:ring-0 focus:border-[#FF5E14] resize-none"
          {...register("description")}
        />
      </div>

      {/* ── Tipo de reto — cards visuales ── */}
      <div className={sectionClass}>Tipo de reto <span className="text-[#FF5E14]">*</span></div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {CHALLENGE_TYPES.map((t) => (
          <div
            key={t.value}
            onClick={() => handleTypeSelect(t.value)}
            className={cn(
              "p-3 rounded-xl bg-[#161616] border cursor-pointer transition-all",
              selectedType === t.value
                ? "border-[#FF5E14] bg-[rgba(255,94,20,0.06)]"
                : "border-[#2a2a2a] hover:border-[#333]"
            )}
          >
            <div className="text-xl mb-1.5">{t.icon}</div>
            <div className={cn("text-sm font-semibold mb-0.5", selectedType === t.value ? "text-white" : "text-[#ccc]")}>
              {t.name}
            </div>
            <div className="text-[10px] text-[#555] leading-tight">{t.desc}</div>
          </div>
        ))}
      </div>
      {errors.type && <p className="text-xs text-destructive -mt-2 mb-3">{errors.type.message}</p>}
      <input type="hidden" {...register("type")} />

      {/* ── Meta y progreso ── */}
      <div className={sectionClass}>Meta y progreso</div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelClass}>Meta numérica <span className="text-[#FF5E14]">*</span></label>
          <Input
            type="number"
            step="any"
            min={0}
            className={inputClass}
            {...register("goal_value", { valueAsNumber: true })}
          />
          {errors.goal_value && <p className="text-xs text-destructive mt-1">{errors.goal_value.message}</p>}
        </div>
        <div>
          <label className={labelClass}>Unidad <span className="text-[#FF5E14]">*</span></label>
          <Input
            placeholder="visitas, kg, sesiones…"
            className={inputClass}
            {...register("goal_unit")}
          />
          {errors.goal_unit && <p className="text-xs text-destructive mt-1">{errors.goal_unit.message}</p>}
        </div>
      </div>

      {/* ── Duración ── */}
      <div className={sectionClass}>Duración</div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelClass}>Fecha de inicio <span className="text-[#FF5E14]">*</span></label>
          <input
            type="date"
            className="w-full h-9 bg-[#161616] border border-[#2a2a2a] rounded-md px-3 text-sm text-white focus:border-[#FF5E14] focus:outline-none"
            onChange={(e) => setValue("starts_at", e.target.value ? `${e.target.value}T00:00` : "")}
          />
          {errors.starts_at && <p className="text-xs text-destructive mt-1">{errors.starts_at.message}</p>}
          <input type="hidden" {...register("starts_at")} />
        </div>
        <div>
          <label className={labelClass}>Fecha de cierre <span className="text-[#FF5E14]">*</span></label>
          <input
            type="date"
            className="w-full h-9 bg-[#161616] border border-[#2a2a2a] rounded-md px-3 text-sm text-white focus:border-[#FF5E14] focus:outline-none"
            onChange={(e) => setValue("ends_at", e.target.value ? `${e.target.value}T23:59` : "")}
          />
          {errors.ends_at && <p className="text-xs text-destructive mt-1">{errors.ends_at.message}</p>}
          <input type="hidden" {...register("ends_at")} />
        </div>
      </div>

      {/* ── Participantes y premio ── */}
      <div className={sectionClass}>Participantes y premio</div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelClass}>Límite de participantes</label>
          <Input
            type="number"
            min={2}
            max={1000}
            placeholder="Vacío = sin límite"
            className={inputClass}
            {...register("max_participants", { valueAsNumber: true })}
          />
        </div>
        <div>
          <label className={labelClass}>Premio / reconocimiento</label>
          <Input
            placeholder="Ej: Mes gratis, camiseta…"
            className={inputClass}
            {...register("prize_description")}
          />
        </div>
      </div>

      {/* Banner upload placeholder */}
      <div className="mb-4">
        <label className={labelClass}>URL de banner (opcional)</label>
        <Input
          type="url"
          placeholder="https://…"
          className={inputClass}
          {...register("banner_url")}
        />
        {errors.banner_url && <p className="text-xs text-destructive mt-1">{errors.banner_url.message}</p>}
        <p className="text-[10px] text-[#444] mt-1">Imagen que se mostrará en la card del reto</p>
      </div>

      {/* ── Visibilidad ── */}
      <div className={sectionClass}>Visibilidad</div>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {VISIBILITY_OPTS.map((opt) => (
          <div
            key={opt.value}
            onClick={() => handleVisibilitySelect(opt.value)}
            className={cn(
              "p-3 rounded-xl bg-[#161616] border cursor-pointer transition-all",
              visibility === opt.value
                ? "border-[#FF5E14] bg-[rgba(255,94,20,0.06)]"
                : "border-[#2a2a2a] hover:border-[#333]"
            )}
          >
            <div className="text-xl mb-1.5">{opt.icon}</div>
            <div className={cn("text-sm font-semibold mb-0.5", visibility === opt.value ? "text-white" : "text-[#ccc]")}>
              {opt.label}
            </div>
            <div className="text-[10px] text-[#555]">{opt.desc}</div>
          </div>
        ))}
      </div>
      <input type="hidden" {...register("is_public")} />

      {/* Botones */}
      <div className="flex gap-2 pt-2 border-t border-[#1a1a1a]">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="gap-2 bg-[#FF5E14] hover:bg-[#e5540f] text-white"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Crear reto
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-[#2a2a2a] text-[#666] hover:text-white"
          onClick={() => router.back()}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
