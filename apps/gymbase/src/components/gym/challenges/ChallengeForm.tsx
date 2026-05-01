// ChallengeForm.tsx — Formulario admin para crear un reto con campos condicionales por tipo

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Search } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { Textarea } from "@core/components/ui/textarea";
import { Alert, AlertDescription } from "@core/components/ui/alert";
import { createChallenge } from "@/actions/challenge.actions";
import { createChallengeSchema, type CreateChallengeInput } from "@/lib/validations/challenges";
import { cn } from "@core/lib/utils";
import type { Exercise, Routine } from "@/types/gym-routines";

// Definición visual de los tipos de reto disponibles
const CHALLENGE_TYPES = [
  {
    value: "attendance",
    icon: "🏃",
    name: "Asistencia",
    desc: "Meta en visitas al gym. El QR cuenta automáticamente.",
    unit: "asistencias",
    color: "#38BDF8",
  },
  {
    value: "workout",
    icon: "💪",
    name: "Workout",
    desc: "Sesiones de rutina completadas en la app.",
    unit: "sesiones",
    color: "#FF5E14",
  },
  {
    value: "personal_record",
    icon: "🏋️",
    name: "Récord Personal",
    desc: "El miembro que levante más peso en un ejercicio gana.",
    unit: "kg",
    color: "#EF4444",
  },
  {
    value: "weight_loss",
    icon: "⚖️",
    name: "Pérdida de Peso",
    desc: "Quien baje más kg o % de su peso inicial gana.",
    unit: "kg",
    color: "#22C55E",
  },
  {
    value: "custom",
    icon: "⭐",
    name: "Personalizado",
    desc: "El miembro registra su progreso manualmente.",
    unit: "",
    color: "#A855F7",
  },
] as const;

interface ChallengeFormProps {
  exercises: Exercise[];
  routines: Routine[];
}

export function ChallengeForm({ exercises, routines }: ChallengeFormProps): React.ReactNode {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("");
  const [visibility, setVisibility] = useState<string>("all");
  // Para el selector de ejercicio (personal_record)
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseOpen, setExerciseOpen] = useState(false);
  // Para el toggle de rutina específica (workout)
  const [useSpecificRoutine, setUseSpecificRoutine] = useState(false);
  // Modo de pérdida de peso
  const [weightLossMode, setWeightLossMode] = useState<"absolute" | "percentage">("absolute");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateChallengeInput>({
    resolver: zodResolver(createChallengeSchema),
    defaultValues: { is_public: true, weight_loss_mode: "absolute" },
  });

  const watchedExerciseId = watch("exercise_id");

  // Filtro local de ejercicios por búsqueda
  const filteredExercises = useMemo(() => {
    const q = exerciseSearch.toLowerCase();
    return exercises.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 40);
  }, [exercises, exerciseSearch]);

  const selectedExercise = exercises.find((e) => e.id === watchedExerciseId);

  function handleTypeSelect(value: string): void {
    setSelectedType(value);
    setValue("type", value as CreateChallengeInput["type"]);
    const typeInfo = CHALLENGE_TYPES.find((t) => t.value === value);
    if (typeInfo?.unit) setValue("goal_unit", typeInfo.unit);
    // Limpiar campos de tipo anterior
    setValue("exercise_id", null);
    setValue("target_routine_id", null);
    setUseSpecificRoutine(false);
    setExerciseSearch("");
  }

  function handleWeightLossModeToggle(mode: "absolute" | "percentage"): void {
    setWeightLossMode(mode);
    setValue("weight_loss_mode", mode);
    setValue("goal_unit", mode === "percentage" ? "%" : "kg");
  }

  async function onSubmit(data: CreateChallengeInput): Promise<void> {
    setError(null);
    const result = await createChallenge({
      ...data,
      banner_url: data.banner_url || null,
      target_routine_id: useSpecificRoutine ? data.target_routine_id : null,
      weight_loss_mode: selectedType === "weight_loss" ? weightLossMode : null,
    });
    if (result.success) {
      router.push("/admin/challenges");
    } else {
      const msg = typeof result.error === "string" ? result.error : "Verifica los campos del formulario";
      setError(msg);
    }
  }

  const sectionClass =
    "text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.1em] mb-3 mt-6 pb-2 border-b border-[#1a1a1a]";
  const labelClass =
    "text-[10px] font-semibold text-[#666] uppercase tracking-[0.08em] mb-1.5 block";
  const inputClass =
    "h-9 bg-[#161616] border-[#2a2a2a] text-sm focus-visible:ring-0 focus:border-[#FF5E14]";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-0">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Sección: Info básica ── */}
      <div className={sectionClass}>Información básica</div>

      <div className="mb-4">
        <label className={labelClass}>
          Título del reto <span className="text-[#FF5E14]">*</span>
        </label>
        <Input placeholder="Ej: Reto Enero Activo" className={inputClass} {...register("title")} />
        {errors.title && <p className="text-xs text-destructive mt-1">{errors.title.message}</p>}
      </div>

      <div className="mb-4">
        <label className={labelClass}>Descripción y reglas</label>
        <Textarea
          rows={3}
          placeholder="Explicá las reglas y el objetivo del reto…"
          className="bg-[#161616] border-[#2a2a2a] text-sm focus-visible:ring-0 focus:border-[#FF5E14] resize-none"
          {...register("description")}
        />
      </div>

      {/* ── Sección: Tipo de reto ── */}
      <div className={sectionClass}>
        Tipo de reto <span className="text-[#FF5E14]">*</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4 sm:grid-cols-3">
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
            <div
              className={cn(
                "text-sm font-semibold mb-0.5",
                selectedType === t.value ? "text-white" : "text-[#ccc]"
              )}
            >
              {t.name}
            </div>
            <div className="text-[10px] text-[#555] leading-tight">{t.desc}</div>
          </div>
        ))}
      </div>
      {errors.type && <p className="text-xs text-destructive -mt-2 mb-3">{errors.type.message}</p>}
      <input type="hidden" {...register("type")} />

      {/* ── Campos condicionales por tipo ── */}

      {/* personal_record: selector de ejercicio con búsqueda */}
      {selectedType === "personal_record" && (
        <div className="mb-4 p-3.5 bg-[rgba(239,68,68,0.05)] border border-[rgba(239,68,68,0.15)] rounded-xl">
          <label className={labelClass}>
            Ejercicio del reto <span className="text-[#FF5E14]">*</span>
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setExerciseOpen(!exerciseOpen)}
              className="w-full h-9 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 text-sm text-left flex items-center justify-between hover:border-[#FF5E14] transition-colors"
            >
              <span className={selectedExercise ? "text-white" : "text-[#555]"}>
                {selectedExercise ? selectedExercise.name : "Seleccionar ejercicio…"}
              </span>
              <span className="text-[#555]">▾</span>
            </button>

            {exerciseOpen && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-xl">
                <div className="p-2 border-b border-[#222] flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-[#555] flex-shrink-0" />
                  <input
                    autoFocus
                    value={exerciseSearch}
                    onChange={(e) => setExerciseSearch(e.target.value)}
                    placeholder="Buscar ejercicio…"
                    className="bg-transparent flex-1 text-sm text-white placeholder-[#444] outline-none"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {filteredExercises.length === 0 ? (
                    <p className="text-xs text-[#555] text-center py-4">Sin resultados</p>
                  ) : (
                    filteredExercises.map((ex) => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => {
                          setValue("exercise_id", ex.id);
                          setExerciseOpen(false);
                          setExerciseSearch("");
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-[#ccc] hover:bg-[#222] hover:text-white transition-colors flex items-center gap-2"
                      >
                        <span className="text-[11px] text-[#555] w-16 flex-shrink-0">
                          {ex.muscle_group ?? "—"}
                        </span>
                        {ex.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <input type="hidden" {...register("exercise_id")} />
          {errors.exercise_id && (
            <p className="text-xs text-destructive mt-1">{errors.exercise_id.message}</p>
          )}
          <p className="text-[10px] text-[#555] mt-1.5">
            El progreso se actualizará automáticamente con los récords del ejercicio
          </p>
        </div>
      )}

      {/* workout: toggle de rutina específica */}
      {selectedType === "workout" && (
        <div className="mb-4 p-3.5 bg-[rgba(255,94,20,0.04)] border border-[rgba(255,94,20,0.12)] rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-[#ccc]">¿Rutina específica?</p>
              <p className="text-[10px] text-[#555] mt-0.5">
                Si se activa, solo cuentan sesiones de esa rutina
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !useSpecificRoutine;
                setUseSpecificRoutine(next);
                if (!next) setValue("target_routine_id", null);
              }}
              className={`w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${
                useSpecificRoutine ? "bg-[#FF5E14]" : "bg-[#2a2a2a]"
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  useSpecificRoutine ? "translate-x-[18px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {useSpecificRoutine && routines.length > 0 && (
            <div>
              <label className={labelClass}>Seleccionar rutina</label>
              <select
                className="w-full h-9 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 text-sm text-[#ccc] focus:border-[#FF5E14] focus:outline-none appearance-none"
                style={{ colorScheme: "dark" }}
                {...register("target_routine_id")}
              >
                <option value="">Cualquier rutina</option>
                {routines.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* weight_loss: modo kilos / porcentaje */}
      {selectedType === "weight_loss" && (
        <div className="mb-4 p-3.5 bg-[rgba(34,197,94,0.05)] border border-[rgba(34,197,94,0.15)] rounded-xl">
          <p className="text-sm font-medium text-[#ccc] mb-2">Modo de medición</p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: "absolute", label: "Kilos absolutos", desc: "Quien baje más kg" },
                { value: "percentage", label: "Porcentaje", desc: "Quien baje mayor % de su peso inicial" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleWeightLossModeToggle(opt.value)}
                className={cn(
                  "p-2.5 rounded-lg border text-left transition-all",
                  weightLossMode === opt.value
                    ? "border-[rgba(34,197,94,0.4)] bg-[rgba(34,197,94,0.08)]"
                    : "border-[#2a2a2a] bg-[#1a1a1a] hover:border-[#333]"
                )}
              >
                <p
                  className={`text-xs font-semibold ${
                    weightLossMode === opt.value ? "text-[#22C55E]" : "text-[#ccc]"
                  }`}
                >
                  {opt.label}
                </p>
                <p className="text-[10px] text-[#555] mt-0.5 leading-tight">{opt.desc}</p>
              </button>
            ))}
          </div>
          <input type="hidden" {...register("weight_loss_mode")} />
          <p className="text-[10px] text-[#555] mt-2">
            El progreso se registrará automáticamente al ingresar snapshots de salud
          </p>
        </div>
      )}

      {/* custom: unidad libre */}
      {selectedType === "custom" && (
        <div className="mb-4 p-3.5 bg-[rgba(168,85,247,0.05)] border border-[rgba(168,85,247,0.15)] rounded-xl">
          <p className="text-[10px] text-[#555]">
            Los miembros registrarán su progreso manualmente. Define la unidad abajo.
          </p>
        </div>
      )}

      {/* ── Sección: Meta y progreso ── */}
      <div className={sectionClass}>Meta y progreso</div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelClass}>
            Meta numérica <span className="text-[#FF5E14]">*</span>
          </label>
          <Input
            type="number"
            step="any"
            min={0}
            className={inputClass}
            {...register("goal_value", { valueAsNumber: true })}
          />
          {errors.goal_value && (
            <p className="text-xs text-destructive mt-1">{errors.goal_value.message}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>
            Unidad <span className="text-[#FF5E14]">*</span>
          </label>
          <Input
            placeholder={
              selectedType === "custom"
                ? "ej: kilómetros, vasos, pasos…"
                : "visitas, kg, sesiones…"
            }
            className={inputClass}
            {...register("goal_unit")}
          />
          {errors.goal_unit && (
            <p className="text-xs text-destructive mt-1">{errors.goal_unit.message}</p>
          )}
        </div>
      </div>

      {/* ── Sección: Fechas y acceso ── */}
      <div className={sectionClass}>Fechas y acceso</div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelClass}>
            Inicio <span className="text-[#FF5E14]">*</span>
          </label>
          <input
            type="date"
            className="w-full h-9 bg-[#161616] border border-[#2a2a2a] rounded-md px-3 text-sm text-white focus:border-[#FF5E14] focus:outline-none"
            onChange={(e) => setValue("starts_at", e.target.value ? `${e.target.value}T00:00` : "")}
          />
          {errors.starts_at && (
            <p className="text-xs text-destructive mt-1">{errors.starts_at.message}</p>
          )}
          <input type="hidden" {...register("starts_at")} />
        </div>
        <div>
          <label className={labelClass}>
            Cierre <span className="text-[#FF5E14]">*</span>
          </label>
          <input
            type="date"
            className="w-full h-9 bg-[#161616] border border-[#2a2a2a] rounded-md px-3 text-sm text-white focus:border-[#FF5E14] focus:outline-none"
            onChange={(e) => setValue("ends_at", e.target.value ? `${e.target.value}T23:59` : "")}
          />
          {errors.ends_at && (
            <p className="text-xs text-destructive mt-1">{errors.ends_at.message}</p>
          )}
          <input type="hidden" {...register("ends_at")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelClass}>Límite de participantes</label>
          <Input
            type="number"
            min={2}
            max={1000}
            placeholder="Sin límite"
            className={inputClass}
            {...register("max_participants", { valueAsNumber: true })}
          />
        </div>
        <div>
          <label className={labelClass}>Premio / reconocimiento</label>
          <Input
            placeholder="Ej: Mes gratis…"
            className={inputClass}
            {...register("prize_description")}
          />
        </div>
      </div>

      <div className="mb-4">
        <label className={labelClass}>URL de banner (opcional)</label>
        <Input
          type="url"
          placeholder="https://…"
          className={inputClass}
          {...register("banner_url")}
        />
        {errors.banner_url && (
          <p className="text-xs text-destructive mt-1">{errors.banner_url.message}</p>
        )}
      </div>

      {/* Visibilidad */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {(
          [
            { value: "all", icon: "🌐", label: "Todos", desc: "Cualquier miembro activo" },
            { value: "private", icon: "🔒", label: "Privado", desc: "Solo admins" },
          ] as const
        ).map((opt) => (
          <div
            key={opt.value}
            onClick={() => {
              setVisibility(opt.value);
              setValue("is_public", opt.value === "all");
            }}
            className={cn(
              "p-3 rounded-xl bg-[#161616] border cursor-pointer transition-all",
              visibility === opt.value
                ? "border-[#FF5E14] bg-[rgba(255,94,20,0.06)]"
                : "border-[#2a2a2a] hover:border-[#333]"
            )}
          >
            <div className="text-xl mb-1.5">{opt.icon}</div>
            <div
              className={cn(
                "text-sm font-semibold mb-0.5",
                visibility === opt.value ? "text-white" : "text-[#ccc]"
              )}
            >
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
