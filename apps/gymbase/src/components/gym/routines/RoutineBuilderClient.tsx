// RoutineBuilderClient.tsx — Editor visual de rutinas: biblioteca + constructor + resumen

"use client";

import { useState, useDeferredValue, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Dumbbell, X, Loader2, Timer, ChevronDown, Plus } from "lucide-react";
import { addExercise, removeExerciseAction, addDay, updateExerciseParams } from "@/actions/routine.actions";
import { createExercise } from "@/actions/exercise.actions";
import type { RoutineWithDays, Exercise } from "@/types/gym-routines";

const MUSCLE_GROUPS = ["Todos", "Pecho", "Espalda", "Hombros", "Bíceps", "Tríceps", "Piernas", "Core", "Cardio"];

const MUSCLE_LABELS: Record<string, string> = {
  chest: "Pecho", back: "Espalda", shoulders: "Hombros",
  biceps: "Bíceps", triceps: "Tríceps", legs: "Piernas",
  core: "Core", cardio: "Cardio", full_body: "Cuerpo completo",
};

const DIFFICULTY_DOT: Record<string, string> = {
  beginner: "bg-emerald-500",
  intermediate: "bg-amber-400",
  advanced: "bg-red-500",
  expert: "bg-purple-500",
};

interface RoutineBuilderClientProps {
  routine: RoutineWithDays;
  exercises: Exercise[];
}

export function RoutineBuilderClient({ routine, exercises }: RoutineBuilderClientProps): React.ReactNode {
  const router = useRouter();
  const sortedDays = [...(routine.days ?? [])].sort((a, b) => a.day_number - b.day_number);

  const [activeDay, setActiveDay] = useState(sortedDays[0]?.id ?? "");
  const [muscleFilter, setMuscleFilter] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [addingExercise, setAddingExercise] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingDay, setAddingDay] = useState(false);
  // Estado para la expansión de variantes por ejercicio padre
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());
  // Estado para el formulario rápido de nueva variante
  const [addingVariantTo, setAddingVariantTo] = useState<string | null>(null);
  const [variantName, setVariantName] = useState("");
  const [savingVariant, setSavingVariant] = useState(false);

  const deferredSearch = useDeferredValue(searchQuery);
  const currentDay = sortedDays.find((d) => d.id === activeDay);

  // Mapa de variantes: ejercicio padre → lista de variantes hijas
  const variantsMap = useMemo(() => {
    const map: Record<string, Exercise[]> = {};
    for (const ex of exercises) {
      if (ex.parent_exercise_id) {
        if (!map[ex.parent_exercise_id]) map[ex.parent_exercise_id] = [];
        map[ex.parent_exercise_id].push(ex);
      }
    }
    return map;
  }, [exercises]);

  // Solo mostrar ejercicios base en la lista principal (sin padre)
  const baseExercises = useMemo(
    () => exercises.filter((ex) => !ex.parent_exercise_id),
    [exercises]
  );

  // Filtrar ejercicios base por músculo y texto (incluyendo coincidencias en variantes)
  const filteredExercises = baseExercises.filter((ex) => {
    const matchesMuscle =
      muscleFilter === "Todos" ||
      ex.muscle_group?.toLowerCase().includes(muscleFilter.toLowerCase());
    const matchesSearch =
      !deferredSearch ||
      ex.name.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      ex.muscle_group?.toLowerCase().includes(deferredSearch.toLowerCase()) ||
      // Incluir si alguna variante coincide con la búsqueda
      (variantsMap[ex.id] ?? []).some((v) =>
        v.name.toLowerCase().includes(deferredSearch.toLowerCase())
      );
    return matchesMuscle && matchesSearch;
  });

  // Calcular estadísticas y músculos a partir de todos los días de la rutina
  const stats = useMemo(() => {
    const totalExercises = sortedDays.reduce((sum, d) => sum + (d.exercises?.length ?? 0), 0);
    const totalSets = sortedDays.reduce(
      (sum, d) => sum + d.exercises.reduce((s, e) => s + (e.sets ?? 0), 0),
      0
    );
    // Recolectar IDs de ejercicios únicos para obtener sus muscle_groups
    const exerciseIds = new Set(
      sortedDays.flatMap((d) => d.exercises.map((e) => e.exercise_id))
    );
    const muscles = Array.from(
      new Set(
        exercises
          .filter((ex) => exerciseIds.has(ex.id) && ex.muscle_group)
          .map((ex) => ex.muscle_group as string)
      )
    );
    return { totalExercises, totalSets, muscles };
  }, [sortedDays, exercises]);

  async function handleAddExercise(exerciseId: string): Promise<void> {
    if (!activeDay) {
      toast.error("Selecciona un día primero");
      return;
    }
    setAddingExercise(exerciseId);
    const result = await addExercise(activeDay, { exercise_id: exerciseId, sets: 3, reps: "12", rest_seconds: 60 });
    setAddingExercise(null);
    if (result.success) {
      router.refresh();
    } else {
      toast.error(typeof result.error === "string" ? result.error : "Error al agregar");
    }
  }

  async function handleRemoveExercise(routineExerciseId: string): Promise<void> {
    setRemovingId(routineExerciseId);
    const result = await removeExerciseAction(routineExerciseId);
    setRemovingId(null);
    if (result.success) {
      router.refresh();
    } else {
      toast.error("Error al eliminar ejercicio");
    }
  }

  async function handleAddDay(): Promise<void> {
    setAddingDay(true);
    const nextNumber = (routine.days?.length ?? 0) + 1;
    const result = await addDay(routine.id, nextNumber);
    setAddingDay(false);
    if (result.success && result.data) {
      setActiveDay(result.data.id);
      router.refresh();
    } else {
      toast.error("Error al agregar día");
    }
  }

  function toggleExpand(exerciseId: string): void {
    setExpandedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
        // Ocultar el form de agregar variante si se cierra el ejercicio
        if (addingVariantTo === exerciseId) setAddingVariantTo(null);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  }

  // Crea una variante nueva vinculada al ejercicio padre y refresca la lista
  async function handleSaveVariant(parentId: string, parentExercise: Exercise): Promise<void> {
    const name = variantName.trim();
    if (!name) return;
    setSavingVariant(true);
    const result = await createExercise({
      name,
      difficulty: parentExercise.difficulty,
      muscle_group: parentExercise.muscle_group ?? undefined,
      equipment: parentExercise.equipment ?? undefined,
      is_timed: parentExercise.is_timed,
      parent_exercise_id: parentId,
    });
    setSavingVariant(false);
    if (result.success) {
      setVariantName("");
      setAddingVariantTo(null);
      router.refresh();
      toast.success("Variante agregada");
    } else {
      toast.error(typeof result.error === "string" ? result.error : "Error al crear variante");
    }
  }

  // Guarda sets/reps/descanso en blur para no llamar el server en cada keystroke
  async function handleParamBlur(
    routineExerciseId: string,
    field: "sets" | "reps" | "rest_seconds",
    value: string,
  ): Promise<void> {
    const payload =
      field === "reps"
        ? { reps: value || null }
        : { [field]: parseInt(value) || null };
    await updateExerciseParams(routineExerciseId, payload);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_280px] gap-4 items-start">

      {/* ═══ Col 1: Biblioteca de ejercicios ═══ */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Biblioteca
          </span>
          <span className="text-[10px] text-muted-foreground">{filteredExercises.length}</span>
        </div>

        {/* Filtros por grupo muscular */}
        <div className="flex flex-wrap gap-1.5 px-3 py-2.5 border-b border-border">
          {MUSCLE_GROUPS.map((group) => (
            <button
              key={group}
              onClick={() => setMuscleFilter(group)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
                muscleFilter === group
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-muted border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              {group}
            </button>
          ))}
        </div>

        {/* Buscador */}
        <div className="px-3 py-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar ejercicio…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 bg-muted border border-border rounded-lg pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Lista — clic en fila para agregar al día activo; clic en badge para expandir variantes */}
        <div className="max-h-[480px] overflow-y-auto">
          {filteredExercises.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Sin ejercicios</p>
          ) : (
            filteredExercises.map((ex) => {
              const variants = variantsMap[ex.id] ?? [];
              const hasVariants = variants.length > 0;
              const isExpanded = expandedExercises.has(ex.id);

              return (
                <div key={ex.id} className="border-b border-border/50">
                  {/* Fila principal del ejercicio */}
                  <div className="flex items-center">
                    <button
                      onClick={() => handleAddExercise(ex.id)}
                      disabled={addingExercise === ex.id || !activeDay}
                      className="flex-1 flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left disabled:opacity-50 cursor-pointer disabled:cursor-default group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center flex-shrink-0">
                        {addingExercise === ex.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                        ) : (
                          <Dumbbell className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{ex.name}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          {ex.muscle_group ? (MUSCLE_LABELS[ex.muscle_group] ?? ex.muscle_group) : "General"}
                          {ex.is_timed && <Timer className="w-2.5 h-2.5 ml-0.5" />}
                        </p>
                      </div>
                      <div
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DIFFICULTY_DOT[ex.difficulty] ?? "bg-muted-foreground"}`}
                      />
                    </button>

                    {/* Badge de variantes + toggle de expansión */}
                    <button
                      onClick={() => toggleExpand(ex.id)}
                      className="flex items-center gap-1 px-2 py-2.5 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                      title={hasVariants ? `${variants.length} variante${variants.length !== 1 ? "s" : ""}` : "Agregar variantes"}
                    >
                      {hasVariants && (
                        <span className="bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                          {variants.length}
                        </span>
                      )}
                      <ChevronDown
                        className={`w-3 h-3 transition-transform duration-150 ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>

                  {/* Panel expandible: variantes + formulario de nueva variante */}
                  {isExpanded && (
                    <div className="bg-muted/10 border-t border-border/30 pb-1">
                      {variants.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => handleAddExercise(v.id)}
                          disabled={addingExercise === v.id || !activeDay}
                          className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted/40 transition-colors text-left disabled:opacity-50 cursor-pointer disabled:cursor-default group"
                        >
                          {addingExercise === v.id ? (
                            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground flex-shrink-0" />
                          ) : (
                            <div className="w-1 h-1 rounded-full bg-muted-foreground flex-shrink-0 mt-0.5" />
                          )}
                          <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate">
                            {v.name}
                          </p>
                        </button>
                      ))}

                      {/* Formulario rápido para nueva variante */}
                      {addingVariantTo === ex.id ? (
                        <div className="flex items-center gap-1.5 px-4 py-2">
                          <input
                            autoFocus
                            type="text"
                            value={variantName}
                            onChange={(e) => setVariantName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveVariant(ex.id, ex);
                              if (e.key === "Escape") { setAddingVariantTo(null); setVariantName(""); }
                            }}
                            placeholder="Nombre de la variante…"
                            className="flex-1 h-6 bg-background border border-border rounded px-2 text-[11px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                          />
                          <button
                            onClick={() => handleSaveVariant(ex.id, ex)}
                            disabled={savingVariant || !variantName.trim()}
                            className="h-6 px-2 bg-primary/10 border border-primary/30 text-primary text-[10px] font-medium rounded hover:bg-primary/20 transition-colors disabled:opacity-40"
                          >
                            {savingVariant ? <Loader2 className="w-3 h-3 animate-spin" /> : "OK"}
                          </button>
                          <button
                            onClick={() => { setAddingVariantTo(null); setVariantName(""); }}
                            className="h-6 px-2 text-muted-foreground hover:text-foreground text-[10px] rounded transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAddingVariantTo(ex.id); setVariantName(""); }}
                          className="w-full flex items-center gap-1.5 px-4 py-1.5 text-[11px] text-primary hover:text-primary/80 transition-colors text-left"
                        >
                          <Plus className="w-3 h-3" />
                          Agregar variante
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ═══ Col 2: Constructor de rutina ═══ */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header con nombre de rutina */}
        <div className="px-4 py-3 border-b border-border">
          <p className="font-semibold text-foreground">{routine.name}</p>
          {routine.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{routine.description}</p>
          )}
        </div>

        {/* Tabs de días */}
        <div className="flex gap-1.5 px-4 py-3 border-b border-border overflow-x-auto scrollbar-none">
          {sortedDays.map((day) => (
            <button
              key={day.id}
              onClick={() => setActiveDay(day.id)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                activeDay === day.id
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-muted border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              {day.name ?? `Día ${day.day_number}`}
            </button>
          ))}
          <button
            onClick={handleAddDay}
            disabled={addingDay}
            className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-all disabled:opacity-50 flex items-center gap-1"
          >
            {addingDay ? <Loader2 className="w-3 h-3 animate-spin" /> : "+ Día"}
          </button>
        </div>

        {/* Área de ejercicios del día activo */}
        <div className="p-4 min-h-[280px]">
          {!currentDay ? (
            <div className="border-2 border-dashed border-border rounded-xl p-10 text-center">
              <Dumbbell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {sortedDays.length === 0
                  ? "Agrega un día para empezar a construir la rutina"
                  : "Selecciona un día"}
              </p>
            </div>
          ) : currentDay.exercises.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-xl p-10 text-center">
              <p className="text-sm text-muted-foreground">
                Haz clic en un ejercicio de la biblioteca para agregarlo a este día
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {[...currentDay.exercises]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((re, i) => (
                  <div
                    key={re.id}
                    className="bg-muted/30 border border-border rounded-xl px-3 py-2.5 flex items-center gap-3 hover:border-border/80 transition-colors"
                  >
                    {/* Número del ejercicio */}
                    <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground flex-shrink-0">
                      {i + 1}
                    </div>

                    {/* Nombre + controles inline */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground mb-2 truncate">
                        {re.exercise?.name ?? "Ejercicio"}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Series */}
                        <input
                          type="number"
                          defaultValue={re.sets ?? 3}
                          min={1} max={20}
                          onBlur={(e) => handleParamBlur(re.id, "sets", e.target.value)}
                          className="w-10 h-6 bg-background border border-border rounded text-[11px] font-bold text-primary text-center outline-none focus:border-primary transition-colors"
                          title="Series"
                        />
                        <span className="text-[10px] text-muted-foreground">series ×</span>
                        {/* Reps */}
                        <input
                          type="text"
                          defaultValue={re.reps ?? "12"}
                          onBlur={(e) => handleParamBlur(re.id, "reps", e.target.value)}
                          className="w-10 h-6 bg-background border border-border rounded text-[11px] font-bold text-primary text-center outline-none focus:border-primary transition-colors"
                          title="Repeticiones"
                        />
                        <span className="text-[10px] text-muted-foreground">reps</span>
                        <span className="text-[10px] text-muted-foreground mx-0.5">·</span>
                        {/* Descanso */}
                        <input
                          type="number"
                          defaultValue={re.rest_seconds ?? 60}
                          min={0} max={600}
                          onBlur={(e) => handleParamBlur(re.id, "rest_seconds", e.target.value)}
                          className="w-10 h-6 bg-background border border-border rounded text-[11px] font-bold text-sky-500 text-center outline-none focus:border-sky-500 transition-colors"
                          title="Descanso en segundos"
                        />
                        <span className="text-[10px] text-muted-foreground">s</span>
                      </div>
                    </div>

                    {/* Botón eliminar */}
                    <button
                      onClick={() => handleRemoveExercise(re.id)}
                      disabled={removingId === re.id}
                      className="w-7 h-7 flex items-center justify-center opacity-25 hover:opacity-100 transition-opacity flex-shrink-0 rounded hover:bg-red-50"
                    >
                      {removingId === re.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <X className="w-3.5 h-3.5 text-destructive" />
                      }
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Col 3: Resumen ═══ */}
      <div className="space-y-3">
        {/* Estadísticas */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Resumen
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 p-4 pb-3">
            {[
              { val: sortedDays.length, lbl: "Días" },
              { val: stats.totalExercises, lbl: "Ejercicios" },
              { val: stats.totalSets, lbl: "Series" },
            ].map(({ val, lbl }) => (
              <div key={lbl} className="bg-muted/40 rounded-lg p-2.5 text-center">
                <p className="text-xl font-bold text-primary leading-none font-mono">{val}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-1">{lbl}</p>
              </div>
            ))}
          </div>

          {/* Detalles de la rutina */}
          <div className="px-4 pb-3 space-y-1.5 border-t border-border pt-3 text-xs">
            {routine.duration_weeks && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duración</span>
                <span className="font-medium">{routine.duration_weeks} semanas</span>
              </div>
            )}
            {routine.days_per_week && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Días/semana</span>
                <span className="font-medium">{routine.days_per_week}</span>
              </div>
            )}
            {routine.is_template && (
              <div className="mt-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                <p className="text-xs text-primary/80">Plantilla reutilizable</p>
              </div>
            )}
          </div>
        </div>

        {/* Músculos trabajados */}
        {stats.muscles.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              Músculos trabajados
            </p>
            <div className="flex flex-wrap gap-1.5">
              {stats.muscles.map((m) => (
                <span
                  key={m}
                  className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium"
                >
                  {MUSCLE_LABELS[m] ?? m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Leyenda de dificultad */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Dificultad
          </p>
          <div className="space-y-2">
            {[
              { label: "Principiante", dot: "bg-emerald-500" },
              { label: "Intermedio",   dot: "bg-amber-400" },
              { label: "Avanzado",     dot: "bg-red-500" },
              { label: "Experto",      dot: "bg-purple-500" },
            ].map(({ label, dot }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                <span className="text-[11px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
