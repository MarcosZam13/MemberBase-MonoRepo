// ScheduleForm.tsx — Formulario admin para programar una nueva clase con secciones y recurrencia

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@core/components/ui/select";
import { Alert, AlertDescription } from "@core/components/ui/alert";
import { scheduleClass } from "@/actions/calendar.actions";
import { scheduleClassSchema, type ScheduleClassInput } from "@/lib/validations/calendar";
import type { ClassType } from "@/types/gym-calendar";
import type { AdminProfile } from "@/actions/settings.actions";
import { cn } from "@core/lib/utils";

// Duraciones predefinidas en minutos — las más comunes en gyms
const DURATION_OPTIONS = [
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "60 min", minutes: 60 },
  { label: "75 min", minutes: 75 },
  { label: "90 min", minutes: 90 },
  { label: "2 horas", minutes: 120 },
];

// Días de la semana para recurrencia personalizada (ISO: 1=Lun, 7=Dom)
const WEEK_DAYS = [
  { label: "L", iso: 1 }, { label: "M", iso: 2 }, { label: "M", iso: 3 },
  { label: "J", iso: 4 }, { label: "V", iso: 5 }, { label: "S", iso: 6 }, { label: "D", iso: 7 },
];

// Patrones de recurrencia disponibles
const RECURRENCE_PATTERNS = [
  { value: "daily",    label: "Todos los días" },
  { value: "weekdays", label: "Días de semana (L-V)" },
  { value: "weekly",   label: "Semanal" },
  { value: "custom",   label: "Personalizado" },
];

interface ScheduleFormProps {
  classTypes: ClassType[];
  instructors?: AdminProfile[];
}

export function ScheduleForm({ classTypes, instructors = [] }: ScheduleFormProps): React.ReactNode {
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<string>("weekly");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<ScheduleClassInput>({
    resolver: zodResolver(scheduleClassSchema),
  });

  const startsAt = watch("starts_at");

  // Calcula ends_at sumando duración a starts_at
  function applyDuration(minutes: number, start?: string): void {
    const base = start ?? startsAt;
    if (!base) return;
    const startDate = new Date(base);
    if (isNaN(startDate.getTime())) return;
    const endDate = new Date(startDate.getTime() + minutes * 60 * 1000);
    setValue("ends_at", endDate.toISOString().slice(0, 16));
  }

  function handleStartsAtChange(e: React.ChangeEvent<HTMLInputElement>): void {
    register("starts_at").onChange(e);
    applyDuration(durationMinutes, e.target.value);
  }

  function handleDurationChange(value: string): void {
    const minutes = parseInt(value, 10);
    setDurationMinutes(minutes);
    applyDuration(minutes);
  }

  function toggleDay(iso: number): void {
    setSelectedDays((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso]
    );
  }

  async function onSubmit(data: ScheduleClassInput): Promise<void> {
    setFeedback(null);
    const result = await scheduleClass(data);
    if (result.success) {
      setFeedback({ type: "success", message: "Clase programada correctamente" });
      reset();
      setDurationMinutes(60);
      setIsRecurring(false);
      setSelectedDays([]);
    } else {
      const msg = typeof result.error === "string" ? result.error : "Error al programar";
      setFeedback({ type: "error", message: msg });
    }
    setTimeout(() => setFeedback(null), 4000);
  }

  const sectionClass = "text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.1em] mb-3 mt-5 pb-2 border-b border-[#1a1a1a]";
  const labelClass = "text-[10px] font-semibold text-[#666] uppercase tracking-[0.08em] mb-1.5 block";
  const inputClass = "h-9 bg-[#161616] border-[#2a2a2a] text-sm focus:border-[#FF5E14]";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-0">
      {feedback && (
        <Alert variant={feedback.type === "error" ? "destructive" : "default"} className="mb-4">
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      {/* ── Sección: Información de la clase ── */}
      <div className={sectionClass}>Información de la clase</div>

      {/* Tipo de clase con dot de color */}
      <div className="mb-4">
        <label className={labelClass}>Tipo de clase <span className="text-[#FF5E14]">*</span></label>
        <Select onValueChange={(v) => setValue("type_id", v)}>
          <SelectTrigger className={inputClass}>
            <SelectValue placeholder="Seleccionar tipo…" />
          </SelectTrigger>
          <SelectContent position="popper" className="z-50">
            {classTypes.map((ct) => (
              <SelectItem key={ct.id} value={ct.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: ct.color ?? "#FF5E14" }}
                  />
                  {ct.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.type_id && <p className="text-xs text-destructive mt-1">{errors.type_id.message}</p>}
      </div>

      {/* Título personalizado */}
      <div className="mb-4">
        <label className={labelClass}>Título personalizado</label>
        <Input
          placeholder="Vacío = usa el nombre del tipo"
          className={inputClass}
          {...register("title")}
        />
      </div>

      {/* Instructor y Ubicación */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {instructors.length > 0 && (
          <div>
            <label className={labelClass}>Instructor</label>
            <Select onValueChange={(v) => setValue("instructor_id", v)}>
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Seleccionar…" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-50">
                {instructors.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>
                    {inst.full_name ?? inst.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className={instructors.length > 0 ? "" : "col-span-2"}>
          <label className={labelClass}>Ubicación</label>
          <Input
            placeholder="Sala principal, Sala A…"
            className={inputClass}
            {...register("location")}
          />
        </div>
      </div>

      {/* ── Sección: Fecha y horario ── */}
      <div className={sectionClass}>Fecha y horario</div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className={labelClass}>Fecha <span className="text-[#FF5E14]">*</span></label>
          {/* starts_at se construye combinando fecha + hora */}
          <input
            type="date"
            id="class_date"
            className="w-full h-9 bg-[#161616] border border-[#2a2a2a] rounded-md px-3 text-sm text-white focus:border-[#FF5E14] focus:outline-none"
            onChange={(e) => {
              const timeInput = document.getElementById("class_time") as HTMLInputElement;
              const time = timeInput?.value ?? "09:00";
              if (e.target.value && time) {
                const combined = `${e.target.value}T${time}`;
                setValue("starts_at", combined);
                applyDuration(durationMinutes, combined);
              }
            }}
          />
        </div>
        <div>
          <label className={labelClass}>Hora inicio <span className="text-[#FF5E14]">*</span></label>
          <input
            type="time"
            id="class_time"
            className="w-full h-9 bg-[#161616] border border-[#2a2a2a] rounded-md px-3 text-sm text-white focus:border-[#FF5E14] focus:outline-none"
            defaultValue="09:00"
            onChange={(e) => {
              const dateInput = document.getElementById("class_date") as HTMLInputElement;
              const date = dateInput?.value;
              if (date && e.target.value) {
                const combined = `${date}T${e.target.value}`;
                setValue("starts_at", combined);
                applyDuration(durationMinutes, combined);
              }
            }}
          />
          {errors.starts_at && <p className="text-xs text-destructive mt-1">{errors.starts_at.message}</p>}
          <Input type="hidden" {...register("starts_at")} />
        </div>
        <div>
          <label className={labelClass}>Duración</label>
          <Select value={String(durationMinutes)} onValueChange={handleDurationChange}>
            <SelectTrigger className={inputClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" className="z-50">
              {DURATION_OPTIONS.map(({ label, minutes }) => (
                <SelectItem key={minutes} value={String(minutes)}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="hidden" {...register("ends_at")} />
          {errors.ends_at && <p className="text-xs text-destructive mt-1">{errors.ends_at.message}</p>}
        </div>
      </div>

      {/* ── Sección: Capacidad ── */}
      <div className={sectionClass}>Capacidad</div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelClass}>Cupos máximos <span className="text-[#FF5E14]">*</span></label>
          <Input
            type="number"
            min={1}
            max={200}
            placeholder="Sin límite"
            className={inputClass}
            {...register("max_capacity", { valueAsNumber: true })}
          />
        </div>
        <div>
          <label className={labelClass}>Lista de espera</label>
          <Select onValueChange={() => {}}>
            <SelectTrigger className={inputClass}>
              <SelectValue placeholder="Sin lista de espera" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-50">
              <SelectItem value="none">Sin lista de espera</SelectItem>
              <SelectItem value="5">Hasta 5 personas</SelectItem>
              <SelectItem value="10">Hasta 10 personas</SelectItem>
              <SelectItem value="unlimited">Sin límite</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Sección: Recurrencia ── */}
      <div className={sectionClass}>Recurrencia</div>

      {/* Toggle clase recurrente */}
      <div
        className="flex items-center justify-between px-3 py-2.5 bg-[#161616] border border-[#2a2a2a] rounded-lg cursor-pointer mb-3 hover:border-[#333] transition-colors"
        onClick={() => setIsRecurring(!isRecurring)}
      >
        <div>
          <p className="text-sm font-medium text-[#ccc]">Clase recurrente</p>
          <p className="text-[10px] text-[#555] mt-0.5">Repetir en días y horas específicas</p>
        </div>
        {/* Switch visual */}
        <div className={cn(
          "w-9 h-5 rounded-full relative transition-colors",
          isRecurring ? "bg-[#FF5E14]" : "bg-[#2a2a2a]"
        )}>
          <div className={cn(
            "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform",
            isRecurring ? "translate-x-[18px]" : "translate-x-0.5"
          )} />
        </div>
      </div>

      {/* Opciones de recurrencia — aparece solo cuando está activado */}
      {isRecurring && (
        <div className="space-y-3 mb-4 pl-1">
          {/* Chips de patrón */}
          <div className="flex gap-2 flex-wrap">
            {RECURRENCE_PATTERNS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRecurrencePattern(value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  recurrencePattern === value
                    ? "bg-[rgba(255,94,20,0.1)] border-[#FF5E14] text-[#FF5E14]"
                    : "bg-[#1a1a1a] border-[#2a2a2a] text-[#666] hover:border-[#444]"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Días personalizados — solo cuando pattern === 'custom' */}
          {recurrencePattern === "custom" && (
            <div className="flex gap-1.5">
              {WEEK_DAYS.map(({ label, iso }) => (
                <button
                  key={iso}
                  type="button"
                  onClick={() => toggleDay(iso)}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border transition-all",
                    selectedDays.includes(iso)
                      ? "bg-[#FF5E14] border-[#FF5E14] text-white"
                      : "border-[#333] text-[#555] hover:border-[#555]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Fecha de fin de recurrencia */}
          <div>
            <label className={labelClass}>Repetir hasta</label>
            <input
              type="date"
              className="w-full h-9 bg-[#161616] border border-[#2a2a2a] rounded-md px-3 text-sm text-white focus:border-[#FF5E14] focus:outline-none"
            />
          </div>
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="gap-2 w-full bg-[#FF5E14] hover:bg-[#e5540f] text-white mt-2"
      >
        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
        Programar clase
      </Button>
    </form>
  );
}
