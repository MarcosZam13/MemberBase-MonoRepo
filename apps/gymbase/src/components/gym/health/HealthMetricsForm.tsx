// HealthMetricsForm.tsx — Formulario para que admin/trainer registre métricas de salud de un miembro

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { updateHealthProfile } from "@/actions/health.actions";
import { healthProfileSchema, type HealthProfileInput } from "@/lib/validations/health";
import type { HealthProfile } from "@/types/gym-health";

interface HealthMetricsFormProps {
  userId: string;
  profile: HealthProfile | null;
}

const inputCls = "w-full h-9 bg-[#0d0d0d] border border-[#222] rounded-lg px-3 text-sm text-[#ddd] placeholder-[#3a3a3a] focus:border-[#FF5E14] focus:outline-none transition-colors";
const labelCls = "block text-[10px] font-semibold text-[#555] uppercase tracking-[0.07em] mb-1.5";
const textareaCls = "w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-sm text-[#ddd] placeholder-[#3a3a3a] focus:border-[#FF5E14] focus:outline-none transition-colors resize-none";
const selectCls = "w-full h-9 bg-[#0d0d0d] border border-[#222] rounded-lg px-3 text-sm text-[#ddd] focus:border-[#FF5E14] focus:outline-none transition-colors appearance-none";

const AdminBadge = () => (
  <span
    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium"
    style={{ backgroundColor: "#FF5E1415", color: "#FF5E14", border: "1px solid #FF5E1430" }}
  >
    <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
    Solo admin
  </span>
);

export function HealthMetricsForm({ userId, profile }: HealthMetricsFormProps): React.ReactNode {
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<HealthProfileInput>({
    resolver: zodResolver(healthProfileSchema),
    defaultValues: {
      user_id: userId,
      height_cm: profile?.height_cm ?? undefined,
      weight_kg: profile?.weight_kg ?? undefined,
      body_fat_pct: profile?.body_fat_pct ?? undefined,
      muscle_mass_kg: profile?.muscle_mass_kg ?? undefined,
      resting_heart_rate: profile?.resting_heart_rate ?? undefined,
      blood_pressure: profile?.blood_pressure ?? "",
      fitness_level: profile?.fitness_level ?? undefined,
      injuries_notes: profile?.injuries_notes ?? "",
      trainer_notes: profile?.trainer_notes ?? "",
      medical_conditions: profile?.medical_conditions ?? "",
    },
  });

  async function onSubmit(data: HealthProfileInput): Promise<void> {
    setFeedback(null);
    const result = await updateHealthProfile(data);
    if (result.success) {
      setFeedback({ type: "success", message: "Perfil de salud actualizado" });
    } else {
      const msg = typeof result.error === "string" ? result.error : "Error al actualizar";
      setFeedback({ type: "error", message: msg });
    }
    setTimeout(() => setFeedback(null), 3000);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      {feedback && (
        <div className={`px-3 py-2 rounded-lg text-[11px] font-medium ${
          feedback.type === "success"
            ? "bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)] text-[#22C55E]"
            : "bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[#EF4444]"
        }`}>
          {feedback.message}
        </div>
      )}

      <input type="hidden" {...register("user_id")} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Altura (cm)</label>
          <input type="number" step="0.1" className={inputCls} {...register("height_cm", { valueAsNumber: true })} />
          {errors.height_cm && <p className="text-[10px] text-[#EF4444] mt-1">{errors.height_cm.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Peso (kg)</label>
          <input type="number" step="0.1" className={inputCls} {...register("weight_kg", { valueAsNumber: true })} />
          {errors.weight_kg && <p className="text-[10px] text-[#EF4444] mt-1">{errors.weight_kg.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Grasa corporal (%)</label>
          <input type="number" step="0.1" className={inputCls} {...register("body_fat_pct", { valueAsNumber: true })} />
        </div>
        <div>
          <label className={labelCls}>Masa muscular (kg)</label>
          <input type="number" step="0.1" className={inputCls} {...register("muscle_mass_kg", { valueAsNumber: true })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>FC reposo (bpm)</label>
          <input type="number" className={inputCls} {...register("resting_heart_rate", { valueAsNumber: true })} />
        </div>
        <div>
          <label className={labelCls}>Presión arterial</label>
          <input type="text" placeholder="120/80" className={inputCls} {...register("blood_pressure")} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Nivel de condición física</label>
        <select
          {...register("fitness_level")}
          className={selectCls}
          style={{ colorScheme: "dark" }}
        >
          <option value="">Seleccionar...</option>
          <option value="beginner">Principiante</option>
          <option value="intermediate">Intermedio</option>
          <option value="advanced">Avanzado</option>
          <option value="athlete">Atleta</option>
        </select>
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <label className={labelCls} style={{ margin: 0 }}>Lesiones / Notas</label>
          <AdminBadge />
        </div>
        <textarea rows={2} className={textareaCls} {...register("injuries_notes")} />
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <label className={labelCls} style={{ margin: 0 }}>Notas del entrenador</label>
          <AdminBadge />
        </div>
        <textarea rows={2} className={textareaCls} {...register("trainer_notes")} />
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <label className={labelCls} style={{ margin: 0 }}>Condiciones médicas</label>
          <AdminBadge />
        </div>
        <textarea rows={2} className={textareaCls} {...register("medical_conditions")} />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-9 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-opacity disabled:opacity-50"
        style={{ backgroundColor: "#FF5E14", color: "white" }}
      >
        {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {profile ? "Actualizar perfil" : "Crear perfil"}
      </button>
    </form>
  );
}
