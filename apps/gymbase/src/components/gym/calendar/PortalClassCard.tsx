// PortalClassCard.tsx — Card de clase para la vista del portal del miembro

"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { bookClass, cancelMyBooking } from "@/actions/calendar.actions";
import type { ScheduledClass, ClassBooking } from "@/types/gym-calendar";

interface PortalClassCardProps {
  scheduledClass: ScheduledClass;
  myBooking?: ClassBooking;
}

export function PortalClassCard({ scheduledClass, myBooking }: PortalClassCardProps): React.ReactNode {
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const color = scheduledClass.class_type?.color ?? "#FF5E14";
  const startTime = new Date(scheduledClass.starts_at).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
  const endTime = new Date(scheduledClass.ends_at).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
  const bookings = scheduledClass.bookings_count ?? 0;
  const maxCapacity = scheduledClass.max_capacity ?? 0;
  const capacityPct = maxCapacity > 0 ? Math.min(100, (bookings / maxCapacity) * 100) : 0;
  const isFull = maxCapacity > 0 && bookings >= maxCapacity;
  const isAlmostFull = capacityPct >= 80 && !isFull;

  // Color de la barra de capacidad según el llenado
  const barColor = capacityPct >= 90 ? "#EF4444" : capacityPct >= 70 ? "#FACC15" : color;

  async function handleBook(): Promise<void> {
    setIsLoading(true);
    setFeedback(null);
    const result = await bookClass({ class_id: scheduledClass.id });
    if (!result.success) {
      const msg = typeof result.error === "string" ? result.error : "Error al reservar";
      setFeedback(msg);
    }
    setIsLoading(false);
  }

  async function handleCancel(): Promise<void> {
    if (!myBooking) return;
    setIsLoading(true);
    await cancelMyBooking(myBooking.id);
    setIsLoading(false);
  }

  const title = scheduledClass.title || scheduledClass.class_type?.name || "Clase";

  return (
    <div className={`bg-[#111] border rounded-[16px] px-4 py-3.5 transition-all ${myBooking ? "border-[rgba(255,94,20,0.3)] bg-[#140d06]" : "border-[#1e1e1e] hover:border-[#2a2a2a]"}`}>
      <div className="flex gap-3 items-start mb-3">
        {/* Barra de color izquierda */}
        <div className="w-1 rounded-full self-stretch flex-shrink-0" style={{ backgroundColor: color, minHeight: "36px" }} />

        {/* Nombre + meta */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
          <p className="text-[11px] text-[#555] mt-0.5 flex gap-1.5 flex-wrap">
            {scheduledClass.instructor_id && <span>Instructor</span>}
            {scheduledClass.location && <span>· {scheduledClass.location}</span>}
          </p>
        </div>

        {/* Hora + duración */}
        <div className="text-right flex-shrink-0">
          <div className="text-base font-bold font-barlow text-white leading-tight">
            {startTime}
          </div>
          <div className="text-[10px] text-[#555] mt-0.5">
            {(() => {
              const mins = (new Date(scheduledClass.ends_at).getTime() - new Date(scheduledClass.starts_at).getTime()) / 60000;
              return mins >= 60 ? `${mins / 60}h` : `${mins} min`;
            })()}
          </div>
        </div>
      </div>

      {/* Footer: barra de cupos + botón */}
      <div className="flex items-center gap-3">
        {maxCapacity > 0 ? (
          <>
            <div className="flex-1 h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${capacityPct}%`, backgroundColor: barColor }}
              />
            </div>
            <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: barColor }}>
              {bookings}/{maxCapacity}
            </span>
          </>
        ) : (
          <div className="flex-1" />
        )}

        {/* Acciones */}
        {!scheduledClass.is_cancelled && (
          <div className="flex-shrink-0">
            {myBooking ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[rgba(255,94,20,0.1)] border border-[rgba(255,94,20,0.25)] text-[#FF5E14]">
                  Tu reserva
                </span>
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-[rgba(255,94,20,0.3)] text-[#FF5E14] hover:bg-[rgba(255,94,20,0.08)] transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Cancelar"}
                </button>
              </div>
            ) : isFull ? (
              <button
                onClick={handleBook}
                disabled={isLoading}
                className="text-[11px] px-3 py-1.5 rounded-lg font-medium border border-[rgba(250,204,21,0.3)] text-[#FACC15] hover:bg-[rgba(250,204,21,0.08)] transition-colors"
              >
                Lista de espera
              </button>
            ) : (
              <button
                onClick={handleBook}
                disabled={isLoading}
                className="text-[11px] px-3 py-1.5 rounded-lg font-semibold text-white transition-opacity hover:opacity-88 disabled:opacity-50"
                style={{ backgroundColor: color }}
              >
                {isLoading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "Reservar"}
              </button>
            )}
          </div>
        )}
      </div>

      {feedback && <p className="text-xs text-[#EF4444] mt-2">{feedback}</p>}
    </div>
  );
}
