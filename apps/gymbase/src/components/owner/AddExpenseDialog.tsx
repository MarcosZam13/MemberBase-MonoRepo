// AddExpenseDialog.tsx — Modal para registrar un gasto operativo del gym

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { addExpense } from "@/actions/expense.actions";
import type { ExpenseCategory } from "@/actions/expense.actions";

const schema = z.object({
  amount: z.string().min(1, "El monto es requerido"),
  category: z.enum(["equipamiento", "renta", "salarios", "servicios", "marketing", "otro"] as const),
  description: z.string().max(300).optional(),
  expenseDate: z.string().min(1, "La fecha es requerida"),
});
type FormValues = z.infer<typeof schema>;

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  equipamiento: "Equipamiento",
  renta: "Renta",
  salarios: "Salarios",
  servicios: "Servicios públicos",
  marketing: "Marketing",
  otro: "Otro",
};

interface AddExpenseDialogProps {
  onSuccess?: () => void;
}

export function AddExpenseDialog({ onSuccess }: AddExpenseDialogProps): React.ReactNode {
  const [open, setOpen] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { expenseDate: today, category: "otro" },
  });

  function handleClose(): void {
    reset({ expenseDate: today, category: "otro" });
    setOpen(false);
  }

  async function onSubmit(data: FormValues): Promise<void> {
    const amount = parseFloat(data.amount.replace(/,/g, "."));
    if (isNaN(amount) || amount <= 0) {
      toast.error("El monto debe ser un número mayor a 0");
      return;
    }

    const result = await addExpense({
      amount,
      category: data.category,
      description: data.description || null,
      expenseDate: data.expenseDate,
    });

    if (result.success) {
      toast.success("Gasto registrado correctamente");
      handleClose();
      onSuccess?.();
    } else {
      const msg = typeof result.error === "string" ? result.error : "No se pudo guardar el gasto";
      toast.error(msg);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
        style={{ backgroundColor: "#FF5E14", color: "white" }}
      >
        <Plus className="w-3.5 h-3.5" />
        Registrar gasto
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <div
            className="w-full max-w-sm rounded-xl p-6 space-y-5"
            style={{ backgroundColor: "#111111", border: "1px solid #1E1E1E" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="font-barlow font-bold text-lg text-white uppercase tracking-wide">
                Registrar gasto
              </h2>
              <button onClick={handleClose} className="text-[#737373] hover:text-white transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Monto */}
              <div className="space-y-1.5">
                <label className="text-xs text-[#737373] uppercase tracking-wider">Monto (CRC)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="15000"
                  {...register("amount")}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white bg-[#0A0A0A] border border-[#1E1E1E] outline-none focus:border-[#FF5E14] transition-colors"
                />
                {errors.amount && <p className="text-xs text-red-400">{errors.amount.message}</p>}
              </div>

              {/* Categoría */}
              <div className="space-y-1.5">
                <label className="text-xs text-[#737373] uppercase tracking-wider">Categoría</label>
                <select
                  {...register("category")}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white bg-[#0A0A0A] border border-[#1E1E1E] outline-none focus:border-[#FF5E14] transition-colors cursor-pointer"
                >
                  {(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
              </div>

              {/* Fecha */}
              <div className="space-y-1.5">
                <label className="text-xs text-[#737373] uppercase tracking-wider">Fecha</label>
                <input
                  type="date"
                  {...register("expenseDate")}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white bg-[#0A0A0A] border border-[#1E1E1E] outline-none focus:border-[#FF5E14] transition-colors cursor-pointer"
                />
                {errors.expenseDate && <p className="text-xs text-red-400">{errors.expenseDate.message}</p>}
              </div>

              {/* Descripción */}
              <div className="space-y-1.5">
                <label className="text-xs text-[#737373] uppercase tracking-wider">Descripción (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Factura eléctrica abril"
                  {...register("description")}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white bg-[#0A0A0A] border border-[#1E1E1E] outline-none focus:border-[#FF5E14] transition-colors"
                />
              </div>

              {/* Acciones */}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{ backgroundColor: "#FF5E14", color: "white" }}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Guardar gasto
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 h-10 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                  style={{ backgroundColor: "#1A1A1A", color: "#737373", border: "1px solid #1E1E1E" }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
