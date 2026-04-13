// RoutineDayEditor.tsx — Editor de ejercicios dentro de un día de rutina

"use client";

import { useState } from "react";
import { Plus, Trash2, Loader2, GripVertical, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { Label } from "@core/components/ui/label";
import { addExercise, removeExerciseAction, updateExerciseDefaultSetsAction } from "@/actions/routine.actions";
import type { RoutineDay, RoutineExercise, Exercise, DefaultSetConfig } from "@/types/gym-routines";

interface RoutineDayEditorProps {
  day: RoutineDay & { exercises: RoutineExercise[] };
  exercises: Exercise[];
}

// Estado interno para los inputs por serie al configurar una pirámide
type SetConfigRow = { weight: string; reps: string };

// Genera filas vacías para el número de series indicado
function buildEmptyRows(count: number): SetConfigRow[] {
  return Array.from({ length: count }, () => ({ weight: "", reps: "" }));
}

// Convierte las filas del formulario al formato que espera el backend
function rowsToDefaultSets(rows: SetConfigRow[]): DefaultSetConfig[] | null {
  const withData = rows.filter((r) => r.weight !== "" || r.reps !== "");
  if (withData.length === 0) return null;
  return rows.map((r, i) => ({
    set_number: i + 1,
    weight_kg: r.weight !== "" ? parseFloat(r.weight) : null,
    reps: r.reps !== "" ? r.reps : null,
  }));
}

// Convierte default_sets guardados al formato de filas del formulario
function defaultSetsToRows(sets: DefaultSetConfig[], totalSets: number): SetConfigRow[] {
  return Array.from({ length: totalSets }, (_, i) => {
    const s = sets.find((x) => x.set_number === i + 1);
    return {
      weight: s?.weight_kg != null ? String(s.weight_kg) : "",
      reps:   s?.reps ?? "",
    };
  });
}

export function RoutineDayEditor({ day, exercises }: RoutineDayEditorProps): React.ReactNode {
  /* ── Estado del formulario de agregar ejercicio ── */
  const [isAdding,          setIsAdding]          = useState(false);
  const [selectedExercise,  setSelectedExercise]  = useState("");
  const [sets,              setSets]              = useState("3");
  const [reps,              setReps]              = useState("12");
  const [rest,              setRest]              = useState("60");
  // configurar pesos por serie al momento de agregar
  const [showSetConfig,     setShowSetConfig]     = useState(false);
  const [setConfigRows,     setSetConfigRows]     = useState<SetConfigRow[]>(buildEmptyRows(3));

  /* ── Estado de la lista de ejercicios existentes ── */
  const [removingId,        setRemovingId]        = useState<string | null>(null);
  // ID del ejercicio cuya configuración de pirámide está expandida para editar
  const [editingSetConfigId, setEditingSetConfigId] = useState<string | null>(null);
  // Filas de edición para el ejercicio expandido
  const [editRows,          setEditRows]          = useState<SetConfigRow[]>([]);
  const [savingSetConfig,   setSavingSetConfig]   = useState(false);

  // Sincroniza las filas de configuración de sets cuando cambia la cantidad de series
  function handleSetsChange(value: string): void {
    setSets(value);
    const count = parseInt(value) || 3;
    setSetConfigRows((prev) => {
      if (prev.length === count) return prev;
      if (prev.length < count) return [...prev, ...buildEmptyRows(count - prev.length)];
      return prev.slice(0, count);
    });
  }

  function handleSetConfigRow(index: number, field: "weight" | "reps", value: string): void {
    setSetConfigRows((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  }

  async function handleAdd(): Promise<void> {
    if (!selectedExercise) return;
    setIsAdding(true);
    await addExercise(day.id, {
      exercise_id: selectedExercise,
      sets: parseInt(sets) || 3,
      reps,
      rest_seconds: parseInt(rest) || 60,
      default_sets: showSetConfig ? rowsToDefaultSets(setConfigRows) : null,
    });
    // Resetear formulario
    setSelectedExercise("");
    setSets("3");
    setReps("12");
    setRest("60");
    setShowSetConfig(false);
    setSetConfigRows(buildEmptyRows(3));
    setIsAdding(false);
  }

  async function handleRemove(id: string): Promise<void> {
    setRemovingId(id);
    await removeExerciseAction(id);
    setRemovingId(null);
  }

  // Abre el editor de pirámide para un ejercicio de la lista
  function openSetConfigEdit(re: RoutineExercise): void {
    const total = re.sets ?? 3;
    const rows = re.default_sets ? defaultSetsToRows(re.default_sets, total) : buildEmptyRows(total);
    setEditRows(rows);
    setEditingSetConfigId(re.id);
  }

  function handleEditRow(index: number, field: "weight" | "reps", value: string): void {
    setEditRows((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  }

  async function handleSaveSetConfig(re: RoutineExercise): Promise<void> {
    setSavingSetConfig(true);
    await updateExerciseDefaultSetsAction({
      routine_exercise_id: re.id,
      default_sets: rowsToDefaultSets(editRows),
    });
    setSavingSetConfig(false);
    setEditingSetConfigId(null);
  }

  function handleClearSetConfig(re: RoutineExercise): void {
    // Limpiar sin confirmar — el admin puede re-configurar cuando quiera
    updateExerciseDefaultSetsAction({ routine_exercise_id: re.id, default_sets: null });
    setEditingSetConfigId(null);
  }

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <h4 className="font-medium text-sm">Día {day.day_number}{day.name ? ` — ${day.name}` : ""}</h4>

      {/* Lista de ejercicios actuales */}
      {day.exercises.length > 0 ? (
        <div className="space-y-2">
          {day.exercises.sort((a, b) => a.sort_order - b.sort_order).map((re) => (
            <div key={re.id} className="rounded-md border border-border bg-surface overflow-hidden">
              {/* Fila principal del ejercicio */}
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{re.exercise?.name ?? "Ejercicio"}</p>
                      {/* Badge de pirámide configurada */}
                      {re.default_sets && re.default_sets.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(255,94,20,0.12)", color: "#FF5E14", border: "0.5px solid rgba(255,94,20,0.3)" }}>
                          <Layers className="w-2.5 h-2.5" />
                          pirámide
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {re.sets && `${re.sets} series`}{re.reps && ` × ${re.reps}`}{re.rest_seconds && ` · ${re.rest_seconds}s descanso`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Botón para configurar / editar pirámide */}
                  <button
                    onClick={() => editingSetConfigId === re.id ? setEditingSetConfigId(null) : openSetConfigEdit(re)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Configurar pesos por serie"
                  >
                    {editingSetConfigId === re.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(re.id)} disabled={removingId === re.id}>
                    {removingId === re.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-500" />}
                  </Button>
                </div>
              </div>

              {/* Panel de configuración de pirámide (expandible) */}
              {editingSetConfigId === re.id && (
                <div className="border-t border-border px-3 py-3 space-y-2 bg-black/20">
                  <p className="text-xs text-muted-foreground">
                    Configura el peso y reps de cada serie. Se pre-cargan cuando el miembro no tiene sesión previa.
                  </p>
                  {/* Grid por serie */}
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-[40px_1fr_1fr] gap-2 text-[10px] text-muted-foreground px-1">
                      <span>Serie</span><span>Peso (kg)</span><span>Reps</span>
                    </div>
                    {editRows.map((row, i) => (
                      <div key={i} className="grid grid-cols-[40px_1fr_1fr] gap-2 items-center">
                        <span className="text-xs text-center text-muted-foreground font-medium">{i + 1}</span>
                        <Input
                          type="number"
                          placeholder="—"
                          value={row.weight}
                          onChange={(e) => handleEditRow(i, "weight", e.target.value)}
                          className="h-8 text-sm"
                        />
                        <Input
                          placeholder={re.reps ?? "—"}
                          value={row.reps}
                          onChange={(e) => handleEditRow(i, "reps", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => handleSaveSetConfig(re)} disabled={savingSetConfig} className="gap-1 h-7 text-xs">
                      {savingSetConfig ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      Guardar
                    </Button>
                    {re.default_sets && re.default_sets.length > 0 && (
                      <Button size="sm" variant="ghost" onClick={() => handleClearSetConfig(re)} className="h-7 text-xs text-muted-foreground">
                        Limpiar
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setEditingSetConfigId(null)} className="h-7 text-xs">
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Sin ejercicios aún.</p>
      )}

      {/* Agregar ejercicio */}
      <div className="border-t border-border pt-3 space-y-2">
        <Label className="text-xs">Agregar ejercicio</Label>
        <select
          value={selectedExercise}
          onChange={(e) => setSelectedExercise(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">Seleccionar...</option>
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.name} ({ex.muscle_group ?? "General"})</option>
          ))}
        </select>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Series</Label>
            <Input type="number" value={sets} onChange={(e) => handleSetsChange(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Reps</Label>
            <Input value={reps} onChange={(e) => setReps(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Descanso (s)</Label>
            <Input type="number" value={rest} onChange={(e) => setRest(e.target.value)} />
          </div>
        </div>

        {/* Toggle para configurar pesos por serie (pirámide) */}
        <button
          type="button"
          onClick={() => setShowSetConfig((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <Layers className="w-3.5 h-3.5" />
          {showSetConfig ? "Ocultar configuración de pirámide" : "Configurar pesos por serie (pirámide)"}
        </button>

        {/* Inputs por serie cuando el toggle está activo */}
        {showSetConfig && (
          <div className="rounded-md border border-border p-3 space-y-2 bg-black/10">
            <p className="text-xs text-muted-foreground">
              Deja vacío el peso si no querés fijarlo. Las reps vacías usan el valor global de arriba.
            </p>
            <div className="space-y-1.5">
              <div className="grid grid-cols-[40px_1fr_1fr] gap-2 text-[10px] text-muted-foreground px-1">
                <span>Serie</span><span>Peso (kg)</span><span>Reps</span>
              </div>
              {setConfigRows.map((row, i) => (
                <div key={i} className="grid grid-cols-[40px_1fr_1fr] gap-2 items-center">
                  <span className="text-xs text-center text-muted-foreground font-medium">{i + 1}</span>
                  <Input
                    type="number"
                    placeholder="—"
                    value={row.weight}
                    onChange={(e) => handleSetConfigRow(i, "weight", e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Input
                    placeholder={reps || "—"}
                    value={row.reps}
                    onChange={(e) => handleSetConfigRow(i, "reps", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <Button size="sm" onClick={handleAdd} disabled={!selectedExercise || isAdding} className="gap-1">
          {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Agregar
        </Button>
      </div>
    </div>
  );
}
