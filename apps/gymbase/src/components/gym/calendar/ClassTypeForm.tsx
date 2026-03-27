// ClassTypeForm.tsx — Formulario admin para crear tipos de clase con color picker visual

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Check } from "lucide-react";
import { Button } from "@core/components/ui/button";
import { Input } from "@core/components/ui/input";
import { createClassType } from "@/actions/calendar.actions";
import { classTypeSchema, type ClassTypeInput } from "@/lib/validations/calendar";
import { cn } from "@core/lib/utils";

// Paleta de 8 colores predefinidos — coincide con el mockup de diseño
const PRESET_COLORS = [
  "#FF5E14", "#38BDF8", "#A855F7", "#22C55E",
  "#FACC15", "#EF4444", "#EC4899", "#14B8A6",
];

export function ClassTypeForm(): React.ReactNode {
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[0]);

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<ClassTypeInput>({
    resolver: zodResolver(classTypeSchema),
    defaultValues: { color: PRESET_COLORS[0] },
  });

  function handleColorSelect(color: string): void {
    setSelectedColor(color);
    setValue("color", color);
  }

  async function onSubmit(data: ClassTypeInput): Promise<void> {
    setFeedback(null);
    const result = await createClassType(data);
    if (result.success) {
      setFeedback({ type: "success", message: "Tipo de clase creado" });
      reset({ color: PRESET_COLORS[0] });
      setSelectedColor(PRESET_COLORS[0]);
    } else {
      const msg = typeof result.error === "string" ? result.error : "Error al crear";
      setFeedback({ type: "error", message: msg });
    }
    setTimeout(() => setFeedback(null), 3000);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {feedback && (
        <div className={cn(
          "px-3 py-2 rounded-lg text-xs font-medium",
          feedback.type === "success"
            ? "bg-[rgba(34,197,94,0.1)] text-[#22C55E] border border-[rgba(34,197,94,0.25)]"
            : "bg-[rgba(239,68,68,0.1)] text-[#EF4444] border border-[rgba(239,68,68,0.25)]"
        )}>
          {feedback.message}
        </div>
      )}

      {/* Nombre */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold text-[#666] uppercase tracking-[0.08em]">
          Nombre <span className="text-[#FF5E14]">*</span>
        </label>
        <Input
          placeholder="Yoga, Spinning, CrossFit..."
          className="h-9 bg-[#161616] border-[#2a2a2a] text-sm focus:border-[#FF5E14]"
          {...register("name")}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* Descripción */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold text-[#666] uppercase tracking-[0.08em]">
          Descripción
        </label>
        <Input
          placeholder="Descripción breve del tipo de clase"
          className="h-9 bg-[#161616] border-[#2a2a2a] text-sm focus:border-[#FF5E14]"
          {...register("description")}
        />
      </div>

      {/* Color — chips visuales */}
      <div className="space-y-2">
        <label className="text-[10px] font-semibold text-[#666] uppercase tracking-[0.08em]">
          Color identificador <span className="text-[#FF5E14]">*</span>
        </label>
        {/* Campo oculto para el color */}
        <input type="hidden" {...register("color")} value={selectedColor} />
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => handleColorSelect(color)}
              className={cn(
                "w-7 h-7 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center",
                selectedColor === color
                  ? "border-white shadow-[0_0_0_2px_#FF5E14]"
                  : "border-transparent"
              )}
              style={{ backgroundColor: color }}
            >
              {selectedColor === color && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-[#444]">Este color aparece en el calendario y en las cards de clase</p>
      </div>

      <Button
        type="submit"
        size="sm"
        disabled={isSubmitting}
        className="gap-1.5 w-full bg-[#FF5E14] hover:bg-[#e5540f] text-white"
      >
        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
        Crear tipo
      </Button>
    </form>
  );
}
