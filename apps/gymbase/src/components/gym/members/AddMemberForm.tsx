// AddMemberForm.tsx — Formulario para agregar un nuevo miembro desde el panel de administración

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { createMember } from "@/actions/member.actions";
import type { MembershipPlan } from "@/types/database";

const formSchema = z.object({
  full_name: z.string().min(1, "El nombre es requerido").max(100),
  email: z.string().email("Email inválido"),
  phone: z.string().max(20).optional().or(z.literal("")),
  plan_id: z.string().uuid().optional().or(z.literal("")),
  starts_at: z.string().optional().or(z.literal("")),
  expires_at: z.string().optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

interface AddMemberFormProps {
  plans: MembershipPlan[];
}

export function AddMemberForm({ plans }: AddMemberFormProps): React.ReactNode {
  const router = useRouter();
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      starts_at: new Date().toISOString().split("T")[0],
    },
  });

  const startsAt = watch("starts_at");

  // Calcula fecha de vencimiento automática según la duración del plan seleccionado
  function handlePlanSelect(planId: string): void {
    setSelectedPlanId(planId);
    setValue("plan_id", planId);

    if (planId && startsAt) {
      const plan = plans.find((p) => p.id === planId);
      if (plan) {
        const expDate = new Date(startsAt);
        expDate.setDate(expDate.getDate() + plan.duration_days);
        setValue("expires_at", expDate.toISOString().split("T")[0]);
      }
    } else {
      setValue("expires_at", "");
    }
  }

  // Recalcula vencimiento cuando cambia la fecha de inicio
  function handleStartsAtChange(e: React.ChangeEvent<HTMLInputElement>): void {
    register("starts_at").onChange(e);
    const plan = plans.find((p) => p.id === selectedPlanId);
    if (plan && e.target.value) {
      const expDate = new Date(e.target.value);
      expDate.setDate(expDate.getDate() + plan.duration_days);
      setValue("expires_at", expDate.toISOString().split("T")[0]);
    }
  }

  async function onSubmit(values: FormValues): Promise<void> {
    setServerError(null);
    const result = await createMember({
      ...values,
      phone: values.phone || null,
      plan_id: values.plan_id || null,
      starts_at: values.starts_at || null,
      expires_at: values.expires_at || null,
      notes: values.notes || null,
    });

    if (result.success) {
      toast.success("Miembro creado y email de invitación enviado");
      router.push(`/admin/members/${result.data?.id}`);
    } else {
      const error = typeof result.error === "string"
        ? result.error
        : "Verifica los campos del formulario";
      setServerError(error);
      toast.error(error);
    }
  }

  const sectionClass = "text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.1em] mb-3 mt-6 pb-2 border-b border-[#1a1a1a]";
  const labelClass = "text-[10px] font-semibold text-[#555] uppercase tracking-[0.08em] mb-1.5 block";
  const inputClass = "h-9 bg-[#111] border-[#222] text-sm text-[#ddd] placeholder-[#3a3a3a] focus:border-[#FF5E14] rounded-lg";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-0 max-w-2xl">
      {/* Error general del servidor */}
      {serverError && (
        <div className="flex gap-2.5 items-start p-3 bg-[rgba(239,68,68,0.06)] border border-[rgba(239,68,68,0.2)] rounded-lg mb-4">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" className="mt-0.5 flex-shrink-0">
            <circle cx="7" cy="7" r="5.5" />
            <path d="M7 4.5v3M7 9.5v.1" />
          </svg>
          <p className="text-[11px] text-[#EF4444]">{serverError}</p>
        </div>
      )}

      {/* ── Información personal ── */}
      <div className={sectionClass}>Información personal</div>

      <div className="mb-4">
        <label className={labelClass}>
          Nombre completo <span className="text-[#FF5E14]">*</span>
        </label>
        <Input
          placeholder="Ej: Ana Martínez"
          className={inputClass}
          {...register("full_name")}
        />
        {errors.full_name && (
          <p className="text-xs text-[#EF4444] mt-1">{errors.full_name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelClass}>
            Email <span className="text-[#FF5E14]">*</span>
          </label>
          <Input
            type="email"
            placeholder="correo@ejemplo.com"
            className={inputClass}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-[#EF4444] mt-1">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>Teléfono</label>
          <Input
            type="tel"
            placeholder="+506 8888-0000"
            className={inputClass}
            {...register("phone")}
          />
        </div>
      </div>

      {/* ── Membresía ── */}
      <div className={sectionClass}>Membresía</div>

      {plans.length > 0 && (
        <div className="mb-4">
          <label className={labelClass}>Plan de membresía</label>
          <div className="grid grid-cols-2 gap-2.5">
            {plans.filter((p) => p.is_active).map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => handlePlanSelect(plan.id)}
                  className={`text-left p-3 rounded-[10px] border transition-all ${
                    isSelected
                      ? "border-[rgba(255,94,20,0.4)] bg-[rgba(255,94,20,0.05)]"
                      : "border-[#1e1e1e] bg-[#0d0d0d] hover:border-[#2a2a2a]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <p className={`text-[13px] font-semibold leading-none ${isSelected ? "text-[#FF5E14]" : "text-[#ddd]"}`}>
                      {plan.name}
                    </p>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-[#FF5E14] flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                  <p className={`text-[18px] font-bold font-barlow tracking-tight mt-1 leading-none ${isSelected ? "text-[#FF5E14]" : "text-white"}`}>
                    {plan.currency === "CRC" ? "₡" : "$"}{plan.price.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-[#555] mt-1">
                    {plan.duration_days} días · {plan.currency}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelClass}>
            Fecha de inicio <span className="text-[#FF5E14]">*</span>
          </label>
          <input
            type="date"
            style={{ colorScheme: "dark" }}
            className="w-full h-9 bg-[#111] border border-[#222] rounded-lg px-3 text-sm text-[#ddd] focus:border-[#FF5E14] focus:outline-none"
            {...register("starts_at")}
            onChange={handleStartsAtChange}
          />
          {errors.starts_at && (
            <p className="text-xs text-[#EF4444] mt-1">{errors.starts_at.message}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>Fecha de vencimiento</label>
          <input
            type="date"
            style={{ colorScheme: "dark" }}
            className="w-full h-9 bg-[#111] border border-[#222] rounded-lg px-3 text-sm text-[#888] focus:border-[#FF5E14] focus:outline-none"
            {...register("expires_at")}
          />
          <p className="text-[10px] text-[#444] mt-1">Se calcula automático según el plan</p>
        </div>
      </div>

      {/* Callout de invitación por email */}
      <div className="flex gap-2.5 items-start p-3 bg-[rgba(255,94,20,0.05)] border border-[rgba(255,94,20,0.18)] rounded-lg mb-4">
        <Info className="w-3.5 h-3.5 text-[#FF5E14] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#888] leading-relaxed">
          Se enviará un <span className="text-[#FF5E14] font-semibold">email de invitación</span> al
          correo ingresado con un enlace para que el miembro establezca su contraseña.
        </p>
      </div>

      {/* ── Notas internas ── */}
      <div className={sectionClass}>Notas</div>

      <div className="mb-6">
        <label className={labelClass}>Notas internas</label>
        <textarea
          placeholder="Observaciones opcionales sobre el miembro..."
          className="w-full min-h-[72px] bg-[#111] border border-[#222] rounded-lg px-3 py-2.5 text-sm text-[#888] placeholder-[#3a3a3a] focus:border-[#FF5E14] focus:outline-none resize-none font-sans"
          {...register("notes")}
        />
        <p className="text-[10px] text-[#444] mt-1">Las notas son solo visibles para administradores</p>
      </div>

      {/* ── Acciones ── */}
      <div className="flex gap-2.5 justify-end pt-4 border-t border-[#1a1a1a]">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="h-9 px-4 bg-[#1a1a1a] border-[#2a2a2a] text-[#777] hover:text-[#ccc] hover:bg-[#222]"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-9 px-5 bg-[#FF5E14] hover:bg-[#e5540f] text-white gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          Crear miembro
        </Button>
      </div>
    </form>
  );
}
