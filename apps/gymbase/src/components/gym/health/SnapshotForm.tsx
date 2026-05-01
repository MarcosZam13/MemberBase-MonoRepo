// SnapshotForm.tsx — Formulario colapsable para registrar un snapshot de métricas de salud

"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { addHealthSnapshot } from "@/actions/health.actions";

interface SnapshotFormProps {
  userId: string;
}

const inputCls = "w-full h-9 bg-[#0d0d0d] border border-[#222] rounded-lg px-3 text-sm text-[#ddd] placeholder-[#3a3a3a] focus:border-[#FF5E14] focus:outline-none transition-colors";
const labelCls = "block text-[10px] font-semibold text-[#555] uppercase tracking-[0.07em] mb-1.5";

export function SnapshotForm({ userId }: SnapshotFormProps): React.ReactNode {
  const [open, setOpen]         = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Campos controlados — string porque los inputs de número son siempre strings en el DOM
  const [weight, setWeight]   = useState("");
  const [fat, setFat]         = useState("");
  const [muscle, setMuscle]   = useState("");
  const [notes, setNotes]     = useState("");
  const [error, setError]     = useState<string | null>(null);

  function reset(): void {
    setWeight(""); setFat(""); setMuscle(""); setNotes(""); setError(null);
  }

  function handleClose(): void {
    setOpen(false);
    setFeedback(null);
    reset();
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);

    // Validación del campo requerido en el cliente antes de llamar al servidor
    const weightNum = parseFloat(weight);
    if (!weight || isNaN(weightNum) || weightNum <= 0) {
      setError("Ingresa un peso válido mayor a 0");
      return;
    }

    const fatNum    = fat    !== "" ? parseFloat(fat)    : undefined;
    const muscleNum = muscle !== "" ? parseFloat(muscle) : undefined;

    if (fat !== "" && (isNaN(fatNum!) || fatNum! < 0 || fatNum! > 100)) {
      setError("El porcentaje de grasa debe estar entre 0 y 100");
      return;
    }
    if (muscle !== "" && (isNaN(muscleNum!) || muscleNum! <= 0)) {
      setError("La masa muscular debe ser un valor positivo");
      return;
    }

    setSubmitting(true);
    try {
      const result = await addHealthSnapshot({
        user_id: userId,
        weight_kg: weightNum,
        body_fat_pct: fatNum ?? null,
        muscle_mass_kg: muscleNum ?? null,
        notes: notes.trim() || null,
      });

      if (result.success) {
        reset();
        setOpen(false);
        setFeedback({ type: "success", message: "Medición registrada" });
        setTimeout(() => setFeedback(null), 3000);
      } else {
        const msg = typeof result.error === "string" ? result.error : "Error al registrar";
        setError(msg);
      }
    } catch {
      setError("Error de conexión — intenta de nuevo");
    } finally {
      setSubmitting(false);
    }
  }

  // Toast de éxito visible aunque el form esté cerrado
  if (!open) {
    return (
      <div className="space-y-2">
        {feedback?.type === "success" && (
          <div className="px-3 py-2 rounded-lg text-[11px] font-medium bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)] text-[#22C55E]">
            {feedback.message}
          </div>
        )}
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors cursor-pointer"
          style={{ backgroundColor: "#FF5E1415", color: "#FF5E14", border: "1px solid #FF5E1430" }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva medición
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header del formulario */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-[#FF5E14] uppercase tracking-[0.07em]">
          Registrar medición
        </p>
        <button
          type="button"
          onClick={handleClose}
          className="p-1 rounded-md text-[#444] hover:text-[#888] hover:bg-[#1a1a1a] transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg text-[11px] bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[#EF4444]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={labelCls}>Peso (kg) *</label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="70.0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Grasa (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="15.0"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Músculo (kg)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              placeholder="32.0"
              value={muscle}
              onChange={(e) => setMuscle(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Notas (opcional)</label>
          <input
            type="text"
            placeholder="Observaciones..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 h-8 rounded-lg text-[11px] font-medium bg-[#1a1a1a] text-[#666] border border-[#222] hover:text-[#999] transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 h-8 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-opacity disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: "#FF5E14", color: "white" }}
          >
            {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Registrar
          </button>
        </div>
      </form>
    </div>
  );
}
